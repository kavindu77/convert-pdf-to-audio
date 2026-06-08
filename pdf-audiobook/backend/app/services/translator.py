"""
translator.py
─────────────
Translation using multiple free APIs with automatic fallback:
1. LibreTranslate (free, open source, no key needed)
2. MyMemory (backup)
3. Returns original text if all fail
"""
from __future__ import annotations
import logging
import time
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

MAX_CHUNK_CHARS = 4000

# Free public LibreTranslate instances
LIBRETRANSLATE_MIRRORS = [
    "https://libretranslate.com",
    "https://translate.argosopentech.com",
    "https://translate.terraprint.co",
]

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

# LibreTranslate uses slightly different codes
LIBRE_LANG_MAP = {
    "iw": "he", "jw": "jv", "zh-TW": "zh",
    "tl": "fil", "ht": "ht",
}


class TranslationService:

    def translate_pages(
        self,
        pages: list[str],
        target_lang: str,
        source_lang: str = "auto",
        progress_callback=None,
    ) -> list[str]:
        """Translate all pages, combining them into chunks to minimize requests."""
        full_text = "\n\n---PAGEBREAK---\n\n".join(pages)
        chunks = _split_into_chunks(full_text, MAX_CHUNK_CHARS)
        logger.info(f"Translating {len(pages)} pages as {len(chunks)} chunks")

        translated_chunks = []
        for i, chunk in enumerate(chunks):
            if i > 0:
                time.sleep(1)
            translated = self._translate_with_fallback(chunk, target_lang, source_lang)
            translated_chunks.append(translated)
            if progress_callback:
                progress_callback(i + 1, len(chunks))

        full_translated = "\n\n".join(translated_chunks)
        translated_pages = full_translated.split("---PAGEBREAK---")
        translated_pages = [p.strip() for p in translated_pages if p.strip()]

        while len(translated_pages) < len(pages):
            translated_pages.append("")
        return translated_pages[:len(pages)]

    def translate_text(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        if not text.strip():
            return text
        return self._translate_with_fallback(text[:MAX_CHUNK_CHARS], target_lang, source_lang)

    def _translate_with_fallback(self, text: str, target_lang: str, source_lang: str) -> str:
        """Try LibreTranslate mirrors, fall back to Gemini, then return original."""
        import os

        tl = LIBRE_LANG_MAP.get(target_lang, target_lang)
        sl = "auto" if source_lang == "auto" else LIBRE_LANG_MAP.get(source_lang, source_lang)

        # Try each LibreTranslate mirror
        for mirror in LIBRETRANSLATE_MIRRORS:
            try:
                result = self._libretranslate(text, tl, sl, mirror)
                if result and result != text:
                    return result
            except Exception as e:
                logger.warning(f"LibreTranslate mirror {mirror} failed: {e}")
                continue

        # Fallback: try Gemini if API key is set
        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        if gemini_key:
            try:
                return self._gemini_translate(text, target_lang, gemini_key)
            except Exception as e:
                logger.warning(f"Gemini fallback failed: {e}")

        # Last resort: return original text
        logger.error("All translation methods failed — returning original text")
        return text

    def _libretranslate(self, text: str, target: str, source: str, base_url: str) -> str:
        response = httpx.post(
            f"{base_url}/translate",
            json={"q": text, "source": source, "target": target, "format": "text"},
            timeout=30,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        return response.json()["translatedText"]

    def _gemini_translate(self, text: str, target_lang: str, api_key: str) -> str:
        target_name = SUPPORTED_LANGUAGES.get(target_lang, target_lang)
        response = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}",
            json={
                "contents": [{"parts": [{"text": f"Translate to {target_name}. Return only translated text:\n{text}"}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 8192},
            },
            timeout=60,
        )
        response.raise_for_status()
        return response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()

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
