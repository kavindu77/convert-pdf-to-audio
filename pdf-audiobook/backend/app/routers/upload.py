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

# ─── Plan Limits ──────────────────────────────────────────────────────────────
# Free: max 3 non-blank pages, max 3 total jobs ever
# Pro/Student/Business: full access
PLAN_LIMITS = {
    PlanType.free:     {"max_pages": 3,   "max_file_mb": 10,  "jobs_per_day": 3,   "total_jobs": 3},
    PlanType.student:  {"max_pages": 50,  "max_file_mb": 25,  "jobs_per_day": 10,  "total_jobs": 999},
    PlanType.pro:      {"max_pages": 500, "max_file_mb": 50,  "jobs_per_day": 50,  "total_jobs": 999},
    PlanType.business: {"max_pages": 999, "max_file_mb": 50,  "jobs_per_day": 999, "total_jobs": 999},
}

PLAN_DISPLAY = {
    PlanType.free:     "Free (3 pages only)",
    PlanType.student:  "Student (50 pages/PDF)",
    PlanType.pro:      "Pro (500 pages/PDF)",
    PlanType.business: "Business (unlimited)",
}

# ─── Time estimate ────────────────────────────────────────────────────────────
def estimate_time(pages: int) -> str:
    """Estimate processing time based on number of pages."""
    # ~2s per page for translation + ~3s per page for TTS
    total_seconds = pages * 5
    if total_seconds < 60:
        return f"~{total_seconds} seconds"
    minutes = round(total_seconds / 60)
    return f"~{minutes} minute{'s' if minutes > 1 else ''}"


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
            detail=f"File too large. {PLAN_DISPLAY[plan]} allows max {limits['max_file_mb']} MB."
        )

    if len(file_bytes) < 100:
        raise HTTPException(status_code=400, detail="File appears to be empty or corrupt.")

    if not file_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File is not a valid PDF.")

    # ── Free plan: check total jobs ever (not just today) ──
    if plan == PlanType.free:
        from sqlmodel import select, func
        if current_user:
            stmt = select(func.count(ConversionJob.id)).where(
                ConversionJob.user_id == current_user.id,
            )
        else:
            # For anonymous users track by IP via session — limit per IP
            client_ip = request.client.host
            stmt = select(func.count(ConversionJob.id)).where(
                ConversionJob.user_id == None,
            )
        result = await session.exec(stmt)
        total_count = result.one()
        if total_count >= limits["total_jobs"]:
            raise HTTPException(
                status_code=429,
                detail="Free plan limit reached. You have used all 3 free conversions. Please upgrade to continue."
            )

    # ── Paid plans: check daily job limit ──
    if current_user and plan != PlanType.free:
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
                detail=f"Daily limit reached. {PLAN_DISPLAY[plan]} allows {limits['jobs_per_day']} conversions/day."
            )

    # ── Estimate time based on pages ──
    # Quick page count from PDF bytes (approximate)
    page_count_approx = file_bytes.count(b"/Page") or 10
    capped_pages = min(page_count_approx, limits["max_pages"])
    time_estimate = estimate_time(capped_pages)

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
            "estimated_time": time_estimate,
            "is_free_plan": plan == PlanType.free,
        },
    )