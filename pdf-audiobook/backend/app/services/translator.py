"""
translator.py
─────────────
Uses Google Translate's free public endpoint (same as translate.google.com).
No API key. No rate limits. Instant. Supports 100+ languages.
Falls back to returning original text if all methods fail.
"""

from __future__ import annotations
import logging
import time
import urllib.parse
import json
import re

import httpx

logger = logging.getLogger(__name__)

# Google Translate free endpoint — same one the web UI uses
GT_URL = "https://translate.googleapis.com/translate_a/single"

# Max chars per request to avoid payload limits
CHUNK_SIZE = 4500


def _translate_chunk(text: str, target: str, source: str = "auto") -> str:
    """Translate a single chunk via Google Translate free endpoint."""
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
            # Response is a nested list — collect all translated parts
            parts = []
            for item in data[0]:
                if item and item[0]:
                    parts.append(item[0])
            return "".join(parts)
    except Exception as e:
        logger.warning(f"Google Translate chunk failed: {e}")
        return text  # Return original on failure


def translate_text(text: str, target_lang: str, source_lang: str = "auto") -> str:
    """Translate text, splitting into chunks if needed."""
    if not text or not text.strip():
        return text

    if target_lang == source_lang:
        return text

    # Normalize language codes
    tgt = _normalize_lang(target_lang)
    src = _normalize_lang(source_lang) if source_lang != "auto" else "auto"

    # Split into chunks
    if len(text) <= CHUNK_SIZE:
        return _translate_chunk(text, tgt, src)

    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?।])\s+', text)
    chunks = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 > CHUNK_SIZE and current:
            chunks.append(current.strip())
            current = sentence
        else:
            current = (current + " " + sentence).strip()
    if current:
        chunks.append(current)

    # Translate each chunk
    translated_parts = []
    for i, chunk in enumerate(chunks):
        result = _translate_chunk(chunk, tgt, src)
        translated_parts.append(result)
        if i < len(chunks) - 1:
            time.sleep(0.1)  # Small delay between chunks

    return " ".join(translated_parts)


def translate_pages(
    pages: list[str],
    target_lang: str,
    source_lang: str = "auto",
) -> list[str]:
    """Translate a list of page texts."""
    results = []
    for i, page in enumerate(pages):
        logger.info(f"Translating page {i+1}/{len(pages)}")
        translated = translate_text(page, target_lang, source_lang)
        results.append(translated)
    return results


def _normalize_lang(code: str) -> str:
    """Normalize language codes to what Google Translate expects."""
    mapping = {
        "zh-CN": "zh-CN",
        "zh-TW": "zh-TW",
        "iw": "iw",   # Hebrew
        "he": "iw",
    }
    return mapping.get(code, code.split("-")[0] if "-" in code and code not in mapping else code)


def get_supported_languages() -> list[dict]:
    """Return list of supported languages."""
    return [
        {"code": "af", "name": "Afrikaans"},
        {"code": "sq", "name": "Albanian"},
        {"code": "am", "name": "Amharic"},
        {"code": "ar", "name": "Arabic"},
        {"code": "hy", "name": "Armenian"},
        {"code": "az", "name": "Azerbaijani"},
        {"code": "eu", "name": "Basque"},
        {"code": "be", "name": "Belarusian"},
        {"code": "bn", "name": "Bengali"},
        {"code": "bs", "name": "Bosnian"},
        {"code": "bg", "name": "Bulgarian"},
        {"code": "ca", "name": "Catalan"},
        {"code": "ceb", "name": "Cebuano"},
        {"code": "zh-CN", "name": "Chinese (Simplified)"},
        {"code": "zh-TW", "name": "Chinese (Traditional)"},
        {"code": "co", "name": "Corsican"},
        {"code": "hr", "name": "Croatian"},
        {"code": "cs", "name": "Czech"},
        {"code": "da", "name": "Danish"},
        {"code": "nl", "name": "Dutch"},
        {"code": "en", "name": "English"},
        {"code": "eo", "name": "Esperanto"},
        {"code": "et", "name": "Estonian"},
        {"code": "fi", "name": "Finnish"},
        {"code": "fr", "name": "French"},
        {"code": "gl", "name": "Galician"},
        {"code": "ka", "name": "Georgian"},
        {"code": "de", "name": "German"},
        {"code": "el", "name": "Greek"},
        {"code": "gu", "name": "Gujarati"},
        {"code": "ht", "name": "Haitian Creole"},
        {"code": "ha", "name": "Hausa"},
        {"code": "haw", "name": "Hawaiian"},
        {"code": "iw", "name": "Hebrew"},
        {"code": "hi", "name": "Hindi"},
        {"code": "hmn", "name": "Hmong"},
        {"code": "hu", "name": "Hungarian"},
        {"code": "is", "name": "Icelandic"},
        {"code": "ig", "name": "Igbo"},
        {"code": "id", "name": "Indonesian"},
        {"code": "ga", "name": "Irish"},
        {"code": "it", "name": "Italian"},
        {"code": "ja", "name": "Japanese"},
        {"code": "jv", "name": "Javanese"},
        {"code": "kn", "name": "Kannada"},
        {"code": "kk", "name": "Kazakh"},
        {"code": "km", "name": "Khmer"},
        {"code": "rw", "name": "Kinyarwanda"},
        {"code": "ko", "name": "Korean"},
        {"code": "ku", "name": "Kurdish"},
        {"code": "ky", "name": "Kyrgyz"},
        {"code": "lo", "name": "Lao"},
        {"code": "la", "name": "Latin"},
        {"code": "lv", "name": "Latvian"},
        {"code": "lt", "name": "Lithuanian"},
        {"code": "lb", "name": "Luxembourgish"},
        {"code": "mk", "name": "Macedonian"},
        {"code": "mg", "name": "Malagasy"},
        {"code": "ms", "name": "Malay"},
        {"code": "ml", "name": "Malayalam"},
        {"code": "mt", "name": "Maltese"},
        {"code": "mi", "name": "Maori"},
        {"code": "mr", "name": "Marathi"},
        {"code": "mn", "name": "Mongolian"},
        {"code": "my", "name": "Myanmar (Burmese)"},
        {"code": "ne", "name": "Nepali"},
        {"code": "no", "name": "Norwegian"},
        {"code": "ny", "name": "Nyanja (Chichewa)"},
        {"code": "or", "name": "Odia (Oriya)"},
        {"code": "ps", "name": "Pashto"},
        {"code": "fa", "name": "Persian"},
        {"code": "pl", "name": "Polish"},
        {"code": "pt", "name": "Portuguese"},
        {"code": "pa", "name": "Punjabi"},
        {"code": "ro", "name": "Romanian"},
        {"code": "ru", "name": "Russian"},
        {"code": "sm", "name": "Samoan"},
        {"code": "gd", "name": "Scots Gaelic"},
        {"code": "sr", "name": "Serbian"},
        {"code": "st", "name": "Sesotho"},
        {"code": "sn", "name": "Shona"},
        {"code": "sd", "name": "Sindhi"},
        {"code": "si", "name": "Sinhala"},
        {"code": "sk", "name": "Slovak"},
        {"code": "sl", "name": "Slovenian"},
        {"code": "so", "name": "Somali"},
        {"code": "es", "name": "Spanish"},
        {"code": "su", "name": "Sundanese"},
        {"code": "sw", "name": "Swahili"},
        {"code": "sv", "name": "Swedish"},
        {"code": "tl", "name": "Tagalog (Filipino)"},
        {"code": "tg", "name": "Tajik"},
        {"code": "ta", "name": "Tamil"},
        {"code": "tt", "name": "Tatar"},
        {"code": "te", "name": "Telugu"},
        {"code": "th", "name": "Thai"},
        {"code": "tr", "name": "Turkish"},
        {"code": "tk", "name": "Turkmen"},
        {"code": "uk", "name": "Ukrainian"},
        {"code": "ur", "name": "Urdu"},
        {"code": "ug", "name": "Uyghur"},
        {"code": "uz", "name": "Uzbek"},
        {"code": "vi", "name": "Vietnamese"},
        {"code": "cy", "name": "Welsh"},
        {"code": "xh", "name": "Xhosa"},
        {"code": "yi", "name": "Yiddish"},
        {"code": "yo", "name": "Yoruba"},
        {"code": "zu", "name": "Zulu"},
    ]


# Alias for backward compatibility with upload.py
SUPPORTED_LANGUAGES = {lang["code"]: lang["name"] for lang in get_supported_languages()}
