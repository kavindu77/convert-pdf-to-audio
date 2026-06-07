"""
routers/jobs.py
───────────────
GET  /api/jobs/{job_id}        — job status + result URLs
GET  /api/jobs/                — list user's jobs (auth required)
DELETE /api/jobs/{job_id}      — delete job and files
"""

import uuid
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user, get_optional_user
from app.database import get_session
from app.models import ConversionJob, User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{job_id}")
async def get_job(
    job_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_user),
):
    try:
        uid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID.")

    job = await session.get(ConversionJob, uid)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # Ownership check: authenticated users can only see their own jobs
    if current_user and job.user_id and job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    chapter_urls = None
    if job.chapter_urls:
        try:
            chapter_urls = json.loads(job.chapter_urls)
        except Exception:
            chapter_urls = []

    return {
        "job_id": str(job.id),
        "status": job.status,
        "progress_percent": job.progress_percent,
        "original_filename": job.original_filename,
        "target_language": job.target_language,
        "target_language_name": job.target_language_name,
        "total_pages": job.total_pages,
        "processed_pages": job.processed_pages,
        "is_scanned_pdf": job.is_scanned_pdf,
        "audio_url": job.audio_url,
        "chapter_urls": chapter_urls,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat(),
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


@router.get("/")
async def list_jobs(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from sqlmodel import select
    statement = (
        select(ConversionJob)
        .where(ConversionJob.user_id == current_user.id)
        .order_by(ConversionJob.created_at.desc())
        .limit(50)
    )
    results = await session.exec(statement)
    jobs = results.all()

    return [
        {
            "job_id": str(j.id),
            "status": j.status,
            "original_filename": j.original_filename,
            "target_language_name": j.target_language_name,
            "audio_url": j.audio_url,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        uid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID.")

    job = await session.get(ConversionJob, uid)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Clean up stored files
    from app.services.storage import storage
    for url_attr in ("audio_url", "extracted_text_url", "translated_text_url"):
        url = getattr(job, url_attr)
        if url and not url.startswith("http"):
            try:
                path = url.lstrip("/files/")
                await storage.delete(path)
            except Exception as e:
                logger.warning(f"Could not delete file {url}: {e}")

    await session.delete(job)
    await session.commit()
    return {"message": "Job deleted successfully."}
