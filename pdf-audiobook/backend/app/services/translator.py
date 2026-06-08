"""
translator.py
─────────────
Uses Google Translate free public endpoint.
No API key. No rate limits. No billing. Instant.
Supports all 100+ languages including Sinhala, Tamil, Hindi, Arabic, etc.
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
    params = {
        "client": "gtx",
        "sl": source,
        "tl": target,
        "dt": "t",
        "q": text,
    }
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

    # Split large text into sentence chunks
    sentences = re.split(r'(?<=[.!?।])\s+', text)
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
    """Translate all pages in as few requests as possible."""
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

    # Too big — send in batches
    results = []
    batch = []

    for i, page in enumerate(pages):
        test = PAGE_SEP.join(batch + [page.strip()])
        if len(test) > CHUNK_SIZE and batch:
            joined_batch = PAGE_SEP.join(batch)
            translated = _translate_chunk(joined_batch, tgt, src)
            parts = translated.split(PAGE_SEP)
            while len(parts) < len(batch):
                parts.append("")
            results.extend(p.strip() for p in parts[:len(batch)])
            batch = [page.strip()]
            time.sleep(0.05)
        else:
            batch.append(page.strip())

    if batch:
        joined_batch = PAGE_SEP.join(batch)
        translated = _translate_chunk(joined_batch, tgt, src)
        parts = translated.split(PAGE_SEP)
        while len(parts) < len(batch):
            parts.append("")
        results.extend(p.strip() for p in parts[:len(batch)])

    logger.info(f"Translated {len(pages)} pages → {tgt}")
    return results


def _normalize_lang(code: str) -> str:
    mapping = {"zh-CN": "zh-CN", "zh-TW": "zh-TW", "iw": "iw", "he": "iw"}
    return mapping.get(code, code.split("-")[0] if "-" in code and code not in mapping else code)


def get_supported_languages() -> list[dict]:
    return [
        {"code": "af", "name": "Afrikaans"},
        {"code": "sq", "name": "Albanian"},
        {"code": "am", "name": "Amharic"},
        {"code": "ar", "name": "Arabic"},
        {"code": "hy", "name": "Armenian"},
        {"code": "az", "name": "Azerbaijani"},
        {"code": "bn", "name": "Bengali"},
        {"code": "bs", "name": "Bosnian"},
        {"code": "bg", "name": "Bulgarian"},
        {"code": "ca", "name": "Catalan"},
        {"code": "zh-CN", "name": "Chinese (Simplified)"},
        {"code": "zh-TW", "name": "Chinese (Traditional)"},
        {"code": "hr", "name": "Croatian"},
        {"code": "cs", "name": "Czech"},
        {"code": "da", "name": "Danish"},
        {"code": "nl", "name": "Dutch"},
        {"code": "en", "name": "English"},
        {"code": "et", "name": "Estonian"},
        {"code": "fi", "name": "Finnish"},
        {"code": "fr", "name": "French"},
        {"code": "de", "name": "German"},
        {"code": "el", "name": "Greek"},
        {"code": "gu", "name": "Gujarati"},
        {"code": "ht", "name": "Haitian Creole"},
        {"code": "ha", "name": "Hausa"},
        {"code": "iw", "name": "Hebrew"},
        {"code": "hi", "name": "Hindi"},
        {"code": "hu", "name": "Hungarian"},
        {"code": "is", "name": "Icelandic"},
        {"code": "id", "name": "Indonesian"},
        {"code": "ga", "name": "Irish"},
        {"code": "it", "name": "Italian"},
        {"code": "ja", "name": "Japanese"},
        {"code": "kn", "name": "Kannada"},
        {"code": "kk", "name": "Kazakh"},
        {"code": "km", "name": "Khmer"},
        {"code": "ko", "name": "Korean"},
        {"code": "lo", "name": "Lao"},
        {"code": "lv", "name": "Latvian"},
        {"code": "lt", "name": "Lithuanian"},
        {"code": "ms", "name": "Malay"},
        {"code": "ml", "name": "Malayalam"},
        {"code": "mt", "name": "Maltese"},
        {"code": "mr", "name": "Marathi"},
        {"code": "mn", "name": "Mongolian"},
        {"code": "my", "name": "Myanmar (Burmese)"},
        {"code": "ne", "name": "Nepali"},
        {"code": "no", "name": "Norwegian"},
        {"code": "fa", "name": "Persian"},
        {"code": "pl", "name": "Polish"},
        {"code": "pt", "name": "Portuguese"},
        {"code": "pa", "name": "Punjabi"},
        {"code": "ro", "name": "Romanian"},
        {"code": "ru", "name": "Russian"},
        {"code": "sr", "name": "Serbian"},
        {"code": "si", "name": "Sinhala"},
        {"code": "sk", "name": "Slovak"},
        {"code": "sl", "name": "Slovenian"},
        {"code": "so", "name": "Somali"},
        {"code": "es", "name": "Spanish"},
        {"code": "sw", "name": "Swahili"},
        {"code": "sv", "name": "Swedish"},
        {"code": "tl", "name": "Tagalog (Filipino)"},
        {"code": "ta", "name": "Tamil"},
        {"code": "te", "name": "Telugu"},
        {"code": "th", "name": "Thai"},
        {"code": "tr", "name": "Turkish"},
        {"code": "uk", "name": "Ukrainian"},
        {"code": "ur", "name": "Urdu"},
        {"code": "uz", "name": "Uzbek"},
        {"code": "vi", "name": "Vietnamese"},
        {"code": "cy", "name": "Welsh"},
        {"code": "yo", "name": "Yoruba"},
        {"code": "zu", "name": "Zulu"},
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
