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
from app.models import ConversionJob, User
from app.services.storage import storage, generate_storage_path
from app.services.translator import SUPPORTED_LANGUAGES

router = APIRouter()
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}
MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


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

    # Validate language
    if target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {target_language}")

    if voice_gender not in ("male", "female", "neutral"):
        voice_gender = "neutral"

    # Read file with size limit
    file_bytes = await file.read()
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB} MB.",
        )

    if len(file_bytes) < 100:
        raise HTTPException(status_code=400, detail="File appears to be empty or corrupt.")

    # Check PDF magic bytes
    if not file_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File is not a valid PDF.")

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

    # Run pipeline in background (no Celery needed)
    from app.services.pipeline import run_pipeline
    asyncio.create_task(run_pipeline(job_id, storage_path))

    return JSONResponse(
        status_code=202,
        content={
            "job_id": job_id,
            "status": "pending",
            "message": "PDF accepted. Processing started.",
        },
    )