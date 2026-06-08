"""
translator.py — Gemini API translation with big-chunk strategy
Instead of translating page by page (many requests),
we combine all pages into a few large requests to stay under
Gemini free tier's 15 requests/minute limit.
"""
from __future__ import annotations
import logging
import os
import time
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# Gemini free tier: 15 requests/min, 1M tokens/min
# We use max 10k chars per request = very few requests for any book
MAX_CHUNK_CHARS = 10000

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

    def translate_pages(
        self,
        pages: list[str],
        target_lang: str,
        source_lang: str = "auto",
        progress_callback=None,
    ) -> list[str]:
        """
        Combine all pages into big chunks, translate each chunk
        in one request. A 300-page book becomes ~10-20 requests
        instead of 300 — well within free tier limits.
        """
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set — returning original text")
            return pages

        target_name = SUPPORTED_LANGUAGES.get(target_lang, target_lang)

        # Step 1: Join all pages with a separator
        full_text = "\n\n--- PAGE BREAK ---\n\n".join(pages)

        # Step 2: Split into big chunks (10k chars each)
        chunks = _split_into_chunks(full_text, MAX_CHUNK_CHARS)
        logger.info(f"Translating {len(pages)} pages as {len(chunks)} big chunks")

        # Step 3: Translate each chunk
        translated_chunks = []
        for i, chunk in enumerate(chunks):
            if i > 0:
                time.sleep(4)  # 4s between requests = max 15/min safely
            logger.info(f"Translating chunk {i+1}/{len(chunks)}")
            translated = self._translate_chunk(chunk, target_name)
            translated_chunks.append(translated)
            if progress_callback:
                progress_callback(i + 1, len(chunks))

        # Step 4: Rejoin and split back into pages
        full_translated = "\n\n".join(translated_chunks)
        translated_pages = full_translated.split("--- PAGE BREAK ---")

        # Make sure we return same number of pages
        translated_pages = [p.strip() for p in translated_pages if p.strip()]

        # Pad or trim to match original page count
        while len(translated_pages) < len(pages):
            translated_pages.append("")
        translated_pages = translated_pages[:len(pages)]

        return translated_pages

    def translate_text(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        """Translate a single piece of text."""
        if not text.strip():
            return text
        if not self.api_key:
            return text
        target_name = SUPPORTED_LANGUAGES.get(target_lang, target_lang)
        return self._translate_chunk(text[:MAX_CHUNK_CHARS], target_name)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=5, max=60))
    def _translate_chunk(self, text: str, target_language_name: str) -> str:
        prompt = f"""Translate the following text to {target_language_name}.
Keep any "--- PAGE BREAK ---" markers exactly as they are in your output.
Return ONLY the translated text, no explanations, no extra text.

Text:
{text}"""

        response = httpx.post(
            f"{self.api_url}?key={self.api_key}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 8192,
                },
            },
            timeout=120,
        )
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    def detect_language(self, text: str) -> str:
        return "auto"


def _split_into_chunks(text: str, max_chars: int) -> list[str]:
    """Split text into chunks at paragraph boundaries."""
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
