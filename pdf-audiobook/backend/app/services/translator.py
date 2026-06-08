"""
translator.py
─────────────
Translation using Gemini API with proper rate limit handling.
Free tier: 2 requests/minute → wait 35 seconds between requests.
"""
from __future__ import annotations
import logging
import time
import os
import httpx

logger = logging.getLogger(__name__)

# Gemini free tier: 2 requests/minute → 35s gap is safe
REQUEST_DELAY_SECONDS = 35

# Send entire book in ONE request to minimize API calls
# Gemini supports up to 1M tokens — entire books fit in one request
MAX_SINGLE_REQUEST_CHARS = 25000

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
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set — returning original")
            return pages

        target_name = SUPPORTED_LANGUAGES.get(target_lang, target_lang)

        # Combine ALL pages into one big text
        full_text = "\n\n---PAGEBREAK---\n\n".join(pages)

        # Split into chunks only if absolutely necessary
        chunks = _split_into_chunks(full_text, MAX_SINGLE_REQUEST_CHARS)
        logger.info(f"Translating {len(pages)} pages in {len(chunks)} request(s)")

        translated_chunks = []
        for i, chunk in enumerate(chunks):
            if i > 0:
                logger.info(f"Waiting {REQUEST_DELAY_SECONDS}s before next request...")
                time.sleep(REQUEST_DELAY_SECONDS)

            result = self._call_gemini(chunk, target_name)
            translated_chunks.append(result)

            if progress_callback:
                progress_callback(i + 1, len(chunks))

        # Rejoin and split back by page
        full_translated = "\n\n".join(translated_chunks)
        translated_pages = full_translated.split("---PAGEBREAK---")
        translated_pages = [p.strip() for p in translated_pages if p.strip()]

        # Match original count
        while len(translated_pages) < len(pages):
            translated_pages.append("")
        return translated_pages[:len(pages)]

    def translate_text(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        if not text.strip() or not self.api_key:
            return text
        target_name = SUPPORTED_LANGUAGES.get(target_lang, target_lang)
        return self._call_gemini(text[:MAX_SINGLE_REQUEST_CHARS], target_name)

    def _call_gemini(self, text: str, target_language_name: str) -> str:
        prompt = f"""Translate the following text to {target_language_name}.
Keep any "---PAGEBREAK---" markers exactly as they appear.
Return ONLY the translated text, nothing else.

{text}"""

        for attempt in range(3):
            try:
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

                if response.status_code == 429:
                    wait = 60 * (attempt + 1)
                    logger.warning(f"Rate limited — waiting {wait}s before retry {attempt+1}/3")
                    time.sleep(wait)
                    continue

                response.raise_for_status()
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()

            except Exception as e:
                logger.error(f"Gemini attempt {attempt+1} failed: {e}")
                if attempt < 2:
                    time.sleep(30)

        logger.error("All Gemini attempts failed — returning original text")
        return text

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
