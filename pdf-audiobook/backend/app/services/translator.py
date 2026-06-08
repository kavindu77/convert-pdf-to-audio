"""
translator.py — MyMemory API (completely free, no API key needed)
Supports 100+ languages, no rate limits for normal use.
"""
from __future__ import annotations
import logging
import time
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# MyMemory free limit: 5000 chars per request
MAX_CHUNK_CHARS = 4500

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

# MyMemory language code fixes
MYMEMORY_LANG_MAP = {
    "iw": "he", "jw": "jv", "zh": "zh-CN", "zh-TW": "zh-TW",
}


class TranslationService:

    def translate_pages(
        self,
        pages: list[str],
        target_lang: str,
        source_lang: str = "auto",
        progress_callback=None,
    ) -> list[str]:
        """Translate all pages using MyMemory API — free, no key needed."""
        # Combine all pages into big chunks to reduce requests
        full_text = "\n\n---PAGEBREAK---\n\n".join(pages)
        chunks = _split_into_chunks(full_text, MAX_CHUNK_CHARS)

        logger.info(f"Translating {len(pages)} pages as {len(chunks)} chunks via MyMemory")

        translated_chunks = []
        for i, chunk in enumerate(chunks):
            if i > 0:
                time.sleep(1)  # small delay between requests
            translated = self._translate_chunk(chunk, target_lang, source_lang)
            translated_chunks.append(translated)
            if progress_callback:
                progress_callback(i + 1, len(chunks))

        # Rejoin and split back into pages
        full_translated = "\n\n".join(translated_chunks)
        translated_pages = full_translated.split("---PAGEBREAK---")
        translated_pages = [p.strip() for p in translated_pages if p.strip()]

        # Match original page count
        while len(translated_pages) < len(pages):
            translated_pages.append("")
        return translated_pages[:len(pages)]

    def translate_text(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        if not text.strip():
            return text
        chunks = _split_into_chunks(text, MAX_CHUNK_CHARS)
        results = []
        for chunk in chunks:
            results.append(self._translate_chunk(chunk, target_lang, source_lang))
            time.sleep(0.5)
        return "\n\n".join(results)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _translate_chunk(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        # Fix language codes for MyMemory
        tl = MYMEMORY_LANG_MAP.get(target_lang, target_lang)
        sl = "en" if source_lang == "auto" else MYMEMORY_LANG_MAP.get(source_lang, source_lang)

        response = httpx.get(
            "https://api.mymemory.translated.net/get",
            params={
                "q": text,
                "langpair": f"{sl}|{tl}",
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        if data.get("responseStatus") == 200:
            return data["responseData"]["translatedText"]
        else:
            logger.warning(f"MyMemory error: {data.get('responseDetails')}")
            return text  # return original if translation fails

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
