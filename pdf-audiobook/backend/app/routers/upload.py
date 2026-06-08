import uuid
import logging
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_optional_user
from app.config import get_settings
from app.database import get_session
from app.models import ConversionJob, User, PlanType
from app.services.storage import storage, generate_storage_path
from app.services.translator import SUPPORTED_LANGUAGES

router = APIRouter()
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}
MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024

# Plan limits
PLAN_LIMITS = {
    PlanType.free:     {"max_pages": 10,  "max_file_mb": 10,  "jobs_per_day": 3},
    PlanType.student:  {"max_pages": 50,  "max_file_mb": 25,  "jobs_per_day": 10},
    PlanType.pro:      {"max_pages": 500, "max_file_mb": 50,  "jobs_per_day": 50},
    PlanType.business: {"max_pages": 999, "max_file_mb": 50,  "jobs_per_day": 999},
}

PLAN_DISPLAY = {
    PlanType.free:     "Free (10 pages/PDF)",
    PlanType.student:  "Student (50 pages/PDF)",
    PlanType.pro:      "Pro (500 pages/PDF)",
    PlanType.business: "Business (unlimited)",
}


@router.post("/pdf")
@limiter.limit("10/minute")
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    target_language: str = Form(...),
    source_language: str = Form(default="auto"),
    voice_gender: str = Form(default="neutral"),
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_user),
):
    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    if target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {target_language}")

    if voice_gender not in ("male", "female", "neutral"):
        voice_gender = "neutral"

    # Determine plan
    plan = current_user.plan if current_user else PlanType.free
    limits = PLAN_LIMITS[plan]
    max_bytes = limits["max_file_mb"] * 1024 * 1024

    # Read file
    file_bytes = await file.read()

    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large for your plan. {PLAN_DISPLAY[plan]} allows max {limits['max_file_mb']} MB. Upgrade to Pro for 50 MB."
        )

    if len(file_bytes) < 100:
        raise HTTPException(status_code=400, detail="File appears to be empty or corrupt.")

    if not file_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File is not a valid PDF.")

    # Check daily job limit for authenticated users
    if current_user:
        from sqlmodel import select, func
        from datetime import date
        today_start = f"{date.today()}T00:00:00"
        stmt = select(func.count(ConversionJob.id)).where(
            ConversionJob.user_id == current_user.id,
            ConversionJob.created_at >= today_start,
        )
        result = await session.exec(stmt)
        today_count = result.one()
        if today_count >= limits["jobs_per_day"]:
            raise HTTPException(
                status_code=429,
                detail=f"Daily limit reached. {PLAN_DISPLAY[plan]} allows {limits['jobs_per_day']} conversions/day. Upgrade for more."
            )

    # Create job record
    job_id = str(uuid.uuid4())
    job = ConversionJob(
        id=uuid.UUID(job_id),
        user_id=current_user.id if current_user else None,
        original_filename=file.filename or "document.pdf",
        source_language=source_language,
        target_language=target_language,
        target_language_name=SUPPORTED_LANGUAGES.get(target_language, target_language),
        voice_gender=voice_gender,
        plan_at_upload=plan.value,
        max_pages=limits["max_pages"],
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    # Store PDF
    storage_path = generate_storage_path(job_id, "original.pdf")
    try:
        await storage.upload(file_bytes, storage_path, "application/pdf")
    except Exception as e:
        logger.error(f"Storage upload failed for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to store file. Please try again.")

    from app.services.pipeline import run_pipeline
    asyncio.create_task(run_pipeline(job_id, storage_path))

    return JSONResponse(
        status_code=202,
        content={
            "job_id": job_id,
            "status": "pending",
            "message": "PDF accepted. Processing started.",
            "plan": plan.value,
            "max_pages": limits["max_pages"],
        },
    )
