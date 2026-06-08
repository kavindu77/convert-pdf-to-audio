"""
translator.py
─────────────
Hybrid translation engine:
  1. DeepL Free API   → European languages (highest quality, fast)
  2. Gemini 1.5 Flash → All other languages (Sinhala, Tamil, Asian, etc.)
  3. Google Translate (gtx fallback) → if both above fail

Gemini rate-limit handling:
  - Max 12 requests/min (safely under the 15 RPM free limit)
  - Automatic retry with exponential backoff on 429
  - Pages batched intelligently to minimize API calls
"""

from __future__ import annotations
import logging
import time
import re
import os
import json
import threading
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
DEEPL_API_KEY    = os.getenv("DEEPL_API_KEY", "")

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
DEEPL_URL  = "https://api-free.deepl.com/v2/translate"   # free tier endpoint
GT_URL     = "https://translate.googleapis.com/translate_a/single"

CHUNK_SIZE = 3000          # characters per API call
PAGE_SEP   = "\n<<<PAGE>>>\n"

# Gemini rate limiter — 12 req/min to stay safely under 15 RPM free limit
GEMINI_RPM_LIMIT  = 12
GEMINI_MIN_GAP    = 60.0 / GEMINI_RPM_LIMIT   # ~5 seconds between requests

# Languages supported by DeepL Free (we route these to DeepL, rest to Gemini)
DEEPL_LANGUAGES = {
    "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr",
    "hu", "id", "it", "ja", "ko", "lt", "lv", "nl", "pl", "pt",
    "ro", "ru", "sk", "sl", "sv", "tr", "uk", "zh",
}

# ─── Gemini Rate Limiter ───────────────────────────────────────────────────────
class _GeminiRateLimiter:
    """Thread-safe token bucket — ensures we never exceed GEMINI_RPM_LIMIT."""
    def __init__(self):
        self._lock = threading.Lock()
        self._last_call = 0.0

    def wait(self):
        with self._lock:
            now = time.time()
            gap = now - self._last_call
            if gap < GEMINI_MIN_GAP:
                time.sleep(GEMINI_MIN_GAP - gap)
            self._last_call = time.time()

_gemini_limiter = _GeminiRateLimiter()


# ─── Gemini Translator ─────────────────────────────────────────────────────────
def _translate_gemini(text: str, target: str, source: str = "auto") -> Optional[str]:
    if not GEMINI_API_KEY:
        return None

    src_hint = f" from {source}" if source != "auto" else ""
    prompt = (
        f"Translate the following text{src_hint} to {target}.\n"
        f"Rules:\n"
        f"- Return ONLY the translated text, nothing else\n"
        f"- Preserve paragraph breaks and line structure\n"
        f"- Do not add explanations, notes, or commentary\n"
        f"- Keep proper nouns, numbers, and formatting intact\n\n"
        f"{text}"
    )

    max_retries = 5
    for attempt in range(max_retries):
        _gemini_limiter.wait()
        try:
            with httpx.Client(timeout=60) as client:
                resp = client.post(
                    GEMINI_URL,
                    params={"key": GEMINI_API_KEY},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 8192},
                    },
                )
                if resp.status_code == 429:
                    wait_time = 30 * (attempt + 1)   # 30s, 60s, 90s ...
                    logger.warning(f"Gemini 429 — waiting {wait_time}s (attempt {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue

                resp.raise_for_status()
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()

        except Exception as e:
            logger.warning(f"Gemini attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(10 * (attempt + 1))

    return None


# ─── DeepL Translator ──────────────────────────────────────────────────────────
def _translate_deepl(text: str, target: str, source: str = "auto") -> Optional[str]:
    if not DEEPL_API_KEY:
        return None

    # DeepL uses uppercase lang codes, PT needs PT-BR/PT-PT
    tgt = target.upper()
    if tgt == "PT":
        tgt = "PT-BR"
    if tgt == "EN":
        tgt = "EN-US"
    if tgt == "ZH":
        tgt = "ZH-HANS"

    payload = {"text": [text], "target_lang": tgt}
    if source != "auto":
        payload["source_lang"] = source.upper()

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                DEEPL_URL,
                headers={"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"},
                json=payload,
            )
            if resp.status_code == 456:
                logger.warning("DeepL quota exceeded for this month")
                return None
            resp.raise_for_status()
            return resp.json()["translations"][0]["text"]
    except Exception as e:
        logger.warning(f"DeepL failed: {e}")
        return None


# ─── Google Translate Fallback ─────────────────────────────────────────────────
def _translate_gtx(text: str, target: str, source: str = "auto") -> str:
    params = {"client": "gtx", "sl": source, "tl": target, "dt": "t", "q": text}
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(GT_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            return "".join(item[0] for item in data[0] if item and item[0])
    except Exception as e:
        logger.warning(f"GTX fallback failed: {e}")
        return text


# ─── Smart Router ──────────────────────────────────────────────────────────────
def _translate_chunk(text: str, target: str, source: str = "auto") -> str:
    """Route to the best available translator, with fallback chain."""
    if not text or not text.strip():
        return text

    tgt_base = target.lower().split("-")[0]

    # Route 1: DeepL for European languages (best quality + fast)
    if tgt_base in DEEPL_LANGUAGES and DEEPL_API_KEY:
        result = _translate_deepl(text, target, source)
        if result:
            logger.debug(f"Translated via DeepL → {target}")
            return result

    # Route 2: Gemini for everything else (or DeepL fallback)
    if GEMINI_API_KEY:
        result = _translate_gemini(text, target, source)
        if result:
            logger.debug(f"Translated via Gemini → {target}")
            return result

    # Route 3: GTX fallback (always works, lower quality)
    logger.info(f"Using GTX fallback for → {target}")
    return _translate_gtx(text, target, source)


# ─── Public API ────────────────────────────────────────────────────────────────
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

    parts = [_translate_chunk(c, tgt, src) for c in chunks]
    return " ".join(parts)


def translate_pages(
    pages: list[str],
    target_lang: str,
    source_lang: str = "auto",
) -> list[str]:
    """
    Translate all pages efficiently.
    Batches multiple pages per API call to reduce request count.
    """
    if not pages:
        return pages

    tgt = _normalize_lang(target_lang)
    src = _normalize_lang(source_lang) if source_lang != "auto" else "auto"

    results = []
    batch, batch_page_count = [], 0

    def _flush_batch(batch):
        joined = PAGE_SEP.join(batch)
        translated = _translate_chunk(joined, tgt, src)
        parts = translated.split(PAGE_SEP)
        # Pad if separator was dropped during translation
        while len(parts) < len(batch):
            parts.append("")
        return [p.strip() for p in parts[:len(batch)]]

    for page in pages:
        page_text = page.strip()
        test_len = sum(len(p) for p in batch) + len(PAGE_SEP) * len(batch) + len(page_text)

        if test_len > CHUNK_SIZE and batch:
            results.extend(_flush_batch(batch))
            batch = [page_text]
        else:
            batch.append(page_text)

    if batch:
        results.extend(_flush_batch(batch))

    logger.info(f"Translated {len(pages)} pages → {tgt}")
    return results


# ─── Lang normalization ────────────────────────────────────────────────────────
def _normalize_lang(code: str) -> str:
    mapping = {"zh-CN": "zh-CN", "zh-TW": "zh-TW", "iw": "iw", "he": "iw"}
    return mapping.get(code, code.split("-")[0] if "-" in code and code not in mapping else code)


# ─── Language list ─────────────────────────────────────────────────────────────
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


# ─── Backward-compat service class ────────────────────────────────────────────
class _TranslationService:
    def translate_pages(self, pages, target_lang, source_lang="auto", progress_callback=None):
        return translate_pages(pages, target_lang, source_lang)

    def translate_text(self, text, target_lang, source_lang="auto"):
        return translate_text(text, target_lang, source_lang)

    def detect_language(self, text):
        return "auto"

translation_service = _TranslationService()
