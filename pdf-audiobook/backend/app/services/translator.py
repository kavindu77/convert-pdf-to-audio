"""
translator.py — Gemini API translation with rate limit handling
"""
from __future__ import annotations
import logging
import os
import time
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

MAX_CHUNK_CHARS = 3000
MAX_PAGES = 10  # limit pages to avoid rate limits on free tier

SUPPORTED_LANGUAGES: dict[str, str] = {
    "af": "Afrikaans", "sq": "Albanian", "am": "Amharic", "ar": "Arabic",
    "hy": "Armenian", "az": "Azerbaijani", "eu": "Basque", "be": "Belarusian",
    "bn": "Bengali", "bs": "Bosnian", "bg": "Bulgarian", "ca": "Catalan",
    "zh": "Chinese (Simplified)", "zh-TW": "Chinese (Traditional)",
    "hr": "Croatian", "cs": "Czech", "da": "Danish", "nl": "Dutch",
    "en": "English", "et": "Estonian", "tl": "Filipino", "fi": "Finnish",
    "fr": "French", "gl": "Galician", "ka": "Georgian", "de": "German",
    "el": "Greek", "gu": "Gujarati", "ht": "Haitian Creole", "ha": "Hausa",
    "iw": "Hebrew", "hi": "Hindi", "hu": "Hungarian", "is": "Icelandic",
    "ig": "Igbo", "id": "Indonesian", "ga": "Irish", "it": "Italian",
    "ja": "Japanese", "kn": "Kannada", "kk": "Kazakh", "km": "Khmer",
    "ko": "Korean", "ku": "Kurdish", "ky": "Kyrgyz", "lo": "Lao",
    "lv": "Latvian", "lt": "Lithuanian", "mk": "Macedonian", "ms": "Malay",
    "ml": "Malayalam", "mt": "Maltese", "mi": "Maori", "mr": "Marathi",
    "mn": "Mongolian", "my": "Myanmar (Burmese)", "ne": "Nepali",
    "no": "Norwegian", "ps": "Pashto", "fa": "Persian", "pl": "Polish",
    "pt": "Portuguese", "pa": "Punjabi", "ro": "Romanian", "ru": "Russian",
    "sm": "Samoan", "sr": "Serbian", "si": "Sinhala", "sk": "Slovak",
    "sl": "Slovenian", "so": "Somali", "es": "Spanish", "sw": "Swahili",
    "sv": "Swedish", "tg": "Tajik", "ta": "Tamil", "te": "Telugu",
    "th": "Thai", "tr": "Turkish", "uk": "Ukrainian", "ur": "Urdu",
    "uz": "Uzbek", "vi": "Vietnamese", "cy": "Welsh", "xh": "Xhosa",
    "yi": "Yiddish", "yo": "Yoruba", "zu": "Zulu",
}


class TranslationService:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY", "")
        self.api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

    def translate_text(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        if not text.strip():
            return text
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set — returning original text")
            return text

        target_name = SUPPORTED_LANGUAGES.get(target_lang, target_lang)
        chunks = _split_into_chunks(text, MAX_CHUNK_CHARS)
        translated_chunks = []

        for i, chunk in enumerate(chunks):
            if i > 0:
                time.sleep(3)  # wait 3 seconds between chunks to avoid rate limit
            translated = self._translate_chunk(chunk, target_name)
            translated_chunks.append(translated)

        return "\n\n".join(translated_chunks)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=5, max=30))
    def _translate_chunk(self, text: str, target_language_name: str) -> str:
        prompt = f"""Translate the following text to {target_language_name}.
Return ONLY the translated text, no explanations, no markdown, no extra text.

Text to translate:
{text}"""

        response = httpx.post(
            f"{self.api_url}?key={self.api_key}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 8192},
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    def translate_pages(
        self,
        pages: list[str],
        target_lang: str,
        source_lang: str = "auto",
        progress_callback=None,
    ) -> list[str]:
        # Limit pages on free tier to avoid rate limits
        limited_pages = pages[:MAX_PAGES]
        if len(pages) > MAX_PAGES:
            logger.warning(f"PDF has {len(pages)} pages — processing first {MAX_PAGES} only (free tier limit)")

        translated = []
        for i, page_text in enumerate(limited_pages):
            if i > 0:
                time.sleep(4)  # 4 second delay between pages
            t = self.translate_text(page_text, target_lang, source_lang)
            translated.append(t)
            if progress_callback:
                progress_callback(i + 1, len(limited_pages))
        return translated

    def detect_language(self, text: str) -> str:
        return "auto"


def _split_into_chunks(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    paragraphs = text.split("\n\n")
    chunks, current = [], ""
    for para in paragraphs:
        if len(current) + len(para) + 2 > max_chars and current:
            chunks.append(current.strip())
            current = para
        else:
            current = (current + "\n\n" + para).strip()
    if current:
        chunks.append(current)
    return chunks


translation_service = TranslationService()
