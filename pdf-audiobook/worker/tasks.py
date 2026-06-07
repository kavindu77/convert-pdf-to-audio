"""
worker/tasks.py
───────────────
Background Celery tasks that run the full pipeline:
  1. Download PDF from storage
  2. Extract text (or OCR)
  3. Translate
  4. Generate TTS audio per chapter
  5. Update job record with results
"""

import json
import logging
import uuid
from datetime import datetime

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "pdf_audiobook",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_acks_late=True,                  # Only ack after success — prevents lost jobs
    worker_prefetch_multiplier=1,
    task_soft_time_limit=600,             # 10 min soft limit
    task_time_limit=900,                  # 15 min hard limit
)

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def process_pdf_job(self, job_id: str, storage_path: str):
    """Full pipeline: extract → translate → TTS → store results."""
    import asyncio
    asyncio.run(_run_pipeline(self, job_id, storage_path))


async def _run_pipeline(task, job_id: str, storage_path: str):
    from app.database import async_session
    from app.models import ConversionJob, JobStatus
    from app.services.pdf_extractor import extract_pdf, split_into_chapters
    from app.services.translator import translation_service
    from app.services.tts_service import tts_service
    from app.services.storage import storage, generate_storage_path

    async with async_session() as session:
        job = await session.get(ConversionJob, uuid.UUID(job_id))
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        try:
            # ── Step 1: Download PDF ──────────────────────────
            _update_status(session, job, JobStatus.extracting, 5)
            await session.commit()

            pdf_bytes = await storage.download(storage_path)

            # ── Step 2: Extract text ──────────────────────────
            result = extract_pdf(pdf_bytes, job.target_language)
            job.total_pages = result.total_pages
            job.is_scanned_pdf = result.is_scanned
            job.processed_pages = len(result.pages)
            job.progress_percent = 30
            await session.commit()

            if not result.pages:
                raise ValueError("No readable text found in PDF.")

            # ── Step 3: Translate ─────────────────────────────
            _update_status(session, job, JobStatus.translating, 35)
            await session.commit()

            page_texts = [p.text for p in result.pages]
            translated_pages = translation_service.translate_pages(
                page_texts,
                target_lang=job.target_language,
                source_lang=job.source_language,
            )

            job.progress_percent = 60
            await session.commit()

            # ── Step 4: Split into chapters & TTS ────────────
            _update_status(session, job, JobStatus.generating_audio, 60)
            await session.commit()

            chapters = split_into_chapters(
                [type("P", (), {"text": t})() for t in translated_pages],
                max_chars=3000,
            )

            chapter_urls: list[str] = []
            for i, chapter_text in enumerate(chapters):
                audio_bytes = tts_service.text_to_speech(
                    chapter_text,
                    language_code=_lang_to_bcp47(job.target_language),
                    gender=job.voice_gender,
                )
                chapter_path = generate_storage_path(job_id, f"chapter_{i+1:03}.mp3")
                url = await storage.upload(audio_bytes, chapter_path, "audio/mpeg")
                chapter_urls.append(url)

                progress = 60 + int((i + 1) / len(chapters) * 35)
                job.progress_percent = progress
                await session.commit()

            # ── Step 5: Save results ──────────────────────────
            job.audio_url = chapter_urls[0] if chapter_urls else None
            job.chapter_urls = json.dumps(chapter_urls)
            job.status = JobStatus.completed
            job.progress_percent = 100
            job.completed_at = datetime.utcnow()
            await session.commit()
            logger.info(f"Job {job_id} completed successfully with {len(chapter_urls)} chapters.")

        except Exception as exc:
            logger.exception(f"Job {job_id} failed: {exc}")
            job.status = JobStatus.failed
            job.error_message = str(exc)[:500]
            await session.commit()

            # Retry on transient errors
            if "quota" in str(exc).lower() or "timeout" in str(exc).lower():
                raise task.retry(exc=exc)


def _update_status(session, job, status, progress: int):
    job.status = status
    job.progress_percent = progress
    job.updated_at = datetime.utcnow()


def _lang_to_bcp47(lang_code: str) -> str:
    """Map simple language code to BCP-47 for TTS."""
    mapping = {
        "zh": "zh-CN", "pt": "pt-BR", "zh-TW": "zh-TW",
        "iw": "he-IL", "jw": "jv-ID",
    }
    return mapping.get(lang_code, f"{lang_code}-{lang_code.upper()[:2]}")
