"""
pipeline.py — runs the full job pipeline without Celery (for free tier)
"""
import json
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


async def run_pipeline(job_id: str, storage_path: str):
    from app.database import async_session
    from app.models import ConversionJob, JobStatus
    from app.services.pdf_extractor import extract_pdf, split_into_chapters
    from app.services.storage import storage

    async with async_session() as session:
        job = await session.get(ConversionJob, uuid.UUID(job_id))
        if not job:
            return

        try:
            # Step 1: Extract
            job.status = JobStatus.extracting
            job.progress_percent = 10
            await session.commit()

            pdf_bytes = await storage.download(storage_path)
            result = extract_pdf(pdf_bytes, job.target_language)

            job.total_pages = result.total_pages
            job.is_scanned_pdf = result.is_scanned
            job.processed_pages = len(result.pages)
            job.progress_percent = 30
            await session.commit()

            if not result.pages:
                raise ValueError("No readable text found in PDF.")

            # Step 2: Translate
            job.status = JobStatus.translating
            job.progress_percent = 35
            await session.commit()

            from app.services.translator import translation_service
            page_texts = [p.text for p in result.pages]
            translated_pages = translation_service.translate_pages(
                page_texts,
                target_lang=job.target_language,
                source_lang=job.source_language,
            )
            job.progress_percent = 60
            await session.commit()

            # Step 3: TTS
            job.status = JobStatus.generating_audio
            job.progress_percent = 65
            await session.commit()

            from app.services.tts_service import tts_service

            class FakePage:
                def __init__(self, text): self.text = text

            chapters = split_into_chapters([FakePage(t) for t in translated_pages], max_chars=3000)
            chapter_urls = []

            for i, chapter_text in enumerate(chapters):
                audio_bytes = tts_service.text_to_speech(
                    chapter_text,
                    language_code=_lang_to_bcp47(job.target_language),
                    gender=job.voice_gender,
                )
                chapter_path = f"jobs/{job_id}/chapter_{i+1:03}.mp3"
                url = await storage.upload(audio_bytes, chapter_path, "audio/mpeg")
                chapter_urls.append(url)
                job.progress_percent = 65 + int((i + 1) / len(chapters) * 30)
                await session.commit()

            job.audio_url = chapter_urls[0] if chapter_urls else None
            job.chapter_urls = json.dumps(chapter_urls)
            job.status = JobStatus.completed
            job.progress_percent = 100
            job.completed_at = datetime.utcnow()
            await session.commit()

        except Exception as exc:
            logger.exception(f"Job {job_id} failed: {exc}")
            job.status = JobStatus.failed
            job.error_message = str(exc)[:500]
            await session.commit()


def _lang_to_bcp47(lang_code: str) -> str:
    mapping = {"zh": "zh-CN", "pt": "pt-BR", "iw": "he-IL", "jw": "jv-ID"}
    return mapping.get(lang_code, f"{lang_code}-{lang_code.upper()[:2]}")