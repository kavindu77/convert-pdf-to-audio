"""
pipeline.py — runs the full job pipeline using sync DB in a background thread
"""
import json
import logging
import uuid
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=1)


async def run_pipeline(job_id: str, storage_path: str):
    """Launch pipeline in background thread."""
    loop = asyncio.get_event_loop()
    loop.run_in_executor(_executor, _run_pipeline_sync, job_id, storage_path)


def _get_sync_db():
    """Create a synchronous psycopg2 connection from the DATABASE_URL."""
    import os
    import psycopg2
    url = os.environ.get("DATABASE_URL", "")
    # Convert asyncpg URL to psycopg2 format
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("postgres+asyncpg://", "postgresql://")
    return psycopg2.connect(url)


def _update_job_sync(conn, job_id: str, **kwargs):
    """Update job fields using sync psycopg2 connection."""
    if not kwargs:
        return
    sets = ", ".join(f"{k} = %s" for k in kwargs)
    vals = list(kwargs.values()) + [job_id]
    with conn.cursor() as cur:
        cur.execute(f"UPDATE conversion_jobs SET {sets} WHERE id = %s", vals)
    conn.commit()


def _get_job_sync(conn, job_id: str) -> dict:
    """Get job as dict using sync connection."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, status, target_language, source_language, 
                   voice_gender, original_filename
            FROM conversion_jobs WHERE id = %s
        """, (job_id,))
        row = cur.fetchone()
        if not row:
            return None
        return {
            "id": str(row[0]),
            "status": row[1],
            "target_language": row[2],
            "source_language": row[3],
            "voice_gender": row[4],
            "original_filename": row[5],
        }


def _run_pipeline_sync(job_id: str, storage_path: str):
    """Run entire pipeline with synchronous DB calls."""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    conn = None
    try:
        conn = _get_sync_db()
        job = _get_job_sync(conn, job_id)
        if not job:
            return

        # Step 1: Extract PDF
        _update_job_sync(conn, job_id, status="extracting", progress_percent=10)

        # Download file using async storage in new loop
        from app.services.storage import storage
        pdf_bytes = loop.run_until_complete(storage.download(storage_path))

        from app.services.pdf_extractor import extract_pdf, split_into_chapters
        result = extract_pdf(pdf_bytes, job["target_language"])

        _update_job_sync(conn, job_id,
            total_pages=result.total_pages,
            is_scanned_pdf=result.is_scanned,
            processed_pages=len(result.pages),
            progress_percent=30,
        )

        if not result.pages:
            raise ValueError("No readable text found in PDF.")

        # Step 2: Translate
        _update_job_sync(conn, job_id, status="translating", progress_percent=35)

        from app.services.translator import translation_service
        page_texts = [p.text for p in result.pages]
        translated_pages = translation_service.translate_pages(
            page_texts,
            target_lang=job["target_language"],
            source_lang=job["source_language"],
        )
        _update_job_sync(conn, job_id, progress_percent=60)

        # Step 3: TTS
        _update_job_sync(conn, job_id, status="generating_audio", progress_percent=65)

        from app.services.tts_service import tts_service

        class FakePage:
            def __init__(self, text): self.text = text

        chapters = split_into_chapters(
            [FakePage(t) for t in translated_pages], max_chars=3000
        )
        chapter_urls = []

        for i, chapter_text in enumerate(chapters):
            audio_bytes = tts_service.text_to_speech(
                chapter_text,
                language_code=_lang_to_bcp47(job["target_language"]),
                gender=job["voice_gender"],
            )
            chapter_path = f"jobs/{job_id}/chapter_{i+1:03}.mp3"
            url = loop.run_until_complete(
                storage.upload(audio_bytes, chapter_path, "audio/mpeg")
            )
            chapter_urls.append(url)
            progress = 65 + int((i + 1) / len(chapters) * 30)
            _update_job_sync(conn, job_id, progress_percent=progress)

        _update_job_sync(conn, job_id,
            audio_url=chapter_urls[0] if chapter_urls else None,
            chapter_urls=json.dumps(chapter_urls),
            status="completed",
            progress_percent=100,
            completed_at=datetime.utcnow().isoformat(),
        )

    except Exception as exc:
        logger.exception(f"Job {job_id} failed: {exc}")
        if conn:
            try:
                _update_job_sync(conn, job_id,
                    status="failed",
                    error_message=str(exc)[:500],
                )
            except Exception:
                pass
    finally:
        if conn:
            conn.close()
        loop.close()


def _lang_to_bcp47(lang_code: str) -> str:
    mapping = {"zh": "zh-CN", "pt": "pt-BR", "iw": "he-IL", "jw": "jv-ID"}
    return mapping.get(lang_code, f"{lang_code}-{lang_code.upper()[:2]}")
