"""
translator.py
─────────────
Google Translate free endpoint.
Supports 8 high-quality languages only.
No API key. No billing. No rate limits.
"""

from __future__ import annotations
import logging
import time
import re
import httpx

logger = logging.getLogger(__name__)

GT_URL     = "https://translate.googleapis.com/translate_a/single"
CHUNK_SIZE = 4500
PAGE_SEP   = " ||| "


def _translate_chunk(text: str, target: str, source: str = "auto") -> str:
    params = {"client": "gtx", "sl": source, "tl": target, "dt": "t", "q": text}
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(GT_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            return "".join(item[0] for item in data[0] if item and item[0])
    except Exception as e:
        logger.warning(f"Google Translate failed: {e}")
        return text


def translate_text(text: str, target_lang: str, source_lang: str = "auto") -> str:
    if not text or not text.strip():
        return text
    if target_lang == source_lang:
        return text

    tgt = _normalize_lang(target_lang)
    src = _normalize_lang(source_lang) if source_lang != "auto" else "auto"

    if len(text) <= CHUNK_SIZE:
        return _translate_chunk(text, tgt, src)

    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks, current = [], ""
    for s in sentences:
        if len(current) + len(s) + 1 > CHUNK_SIZE and current:
            chunks.append(current.strip())
            current = s
        else:
            current = (current + " " + s).strip()
    if current:
        chunks.append(current)

    parts = []
    for i, chunk in enumerate(chunks):
        parts.append(_translate_chunk(chunk, tgt, src))
        if i < len(chunks) - 1:
            time.sleep(0.05)
    return " ".join(parts)


def translate_pages(
    pages: list[str],
    target_lang: str,
    source_lang: str = "auto",
) -> list[str]:
    if not pages:
        return pages

    tgt = _normalize_lang(target_lang)
    src = _normalize_lang(source_lang) if source_lang != "auto" else "auto"

    joined = PAGE_SEP.join(p.strip() for p in pages)

    if len(joined) <= CHUNK_SIZE:
        result = _translate_chunk(joined, tgt, src)
        parts = result.split(PAGE_SEP)
        while len(parts) < len(pages):
            parts.append("")
        return [p.strip() for p in parts[:len(pages)]]

    results = []
    batch = []

    for page in pages:
        test = PAGE_SEP.join(batch + [page.strip()])
        if len(test) > CHUNK_SIZE and batch:
            translated = _translate_chunk(PAGE_SEP.join(batch), tgt, src)
            parts = translated.split(PAGE_SEP)
            while len(parts) < len(batch):
                parts.append("")
            results.extend(p.strip() for p in parts[:len(batch)])
            batch = [page.strip()]
            time.sleep(0.05)
        else:
            batch.append(page.strip())

    if batch:
        translated = _translate_chunk(PAGE_SEP.join(batch), tgt, src)
        parts = translated.split(PAGE_SEP)
        while len(parts) < len(batch):
            parts.append("")
        results.extend(p.strip() for p in parts[:len(batch)])

    logger.info(f"Translated {len(pages)} pages → {tgt}")
    return results


def _normalize_lang(code: str) -> str:
    mapping = {"pt-BR": "pt", "pt-PT": "pt", "zh-CN": "zh-CN", "zh-TW": "zh-TW"}
    return mapping.get(code, code)


def get_supported_languages() -> list[dict]:
    return [
        {"code": "es", "name": "Spanish"},
        {"code": "fr", "name": "French"},
        {"code": "de", "name": "German"},
        {"code": "pt", "name": "Portuguese"},
        {"code": "it", "name": "Italian"},
        {"code": "nl", "name": "Dutch"},
        {"code": "ja", "name": "Japanese"},
        {"code": "en", "name": "English"},
    ]


SUPPORTED_LANGUAGES = {lang["code"]: lang["name"] for lang in get_supported_languages()}


class _TranslationService:
    def translate_pages(self, pages, target_lang, source_lang="auto", progress_callback=None):
        return translate_pages(pages, target_lang, source_lang)

    def translate_text(self, text, target_lang, source_lang="auto"):
        return translate_text(text, target_lang, source_lang)

    def detect_language(self, text):
        return "auto"


translation_service = _TranslationService()
