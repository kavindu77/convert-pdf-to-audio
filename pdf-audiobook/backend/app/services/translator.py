"""
translator.py
─────────────
Translates text using Google Cloud Translation API.
- Splits long text into safe chunks (≤30,000 chars per API call)
- Retries on transient errors
- Preserves paragraph structure
"""

from __future__ import annotations
import logging
import re
from tenacity import retry, stop_after_attempt, wait_exponential

from google.cloud import translate_v2 as translate

logger = logging.getLogger(__name__)

# Google Translate free tier limit per request
MAX_CHUNK_CHARS = 30_000

# All supported languages (Google Translate codes)
SUPPORTED_LANGUAGES: dict[str, str] = {
    "af": "Afrikaans", "sq": "Albanian", "am": "Amharic", "ar": "Arabic",
    "hy": "Armenian", "az": "Azerbaijani", "eu": "Basque", "be": "Belarusian",
    "bn": "Bengali", "bs": "Bosnian", "bg": "Bulgarian", "ca": "Catalan",
    "ceb": "Cebuano", "ny": "Chichewa", "zh": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)", "co": "Corsican", "hr": "Croatian",
    "cs": "Czech", "da": "Danish", "nl": "Dutch", "en": "English",
    "eo": "Esperanto", "et": "Estonian", "tl": "Filipino", "fi": "Finnish",
    "fr": "French", "fy": "Frisian", "gl": "Galician", "ka": "Georgian",
    "de": "German", "el": "Greek", "gu": "Gujarati", "ht": "Haitian Creole",
    "ha": "Hausa", "haw": "Hawaiian", "iw": "Hebrew", "hi": "Hindi",
    "hmn": "Hmong", "hu": "Hungarian", "is": "Icelandic", "ig": "Igbo",
    "id": "Indonesian", "ga": "Irish", "it": "Italian", "ja": "Japanese",
    "jw": "Javanese", "kn": "Kannada", "kk": "Kazakh", "km": "Khmer",
    "ko": "Korean", "ku": "Kurdish (Kurmanji)", "ky": "Kyrgyz", "lo": "Lao",
    "la": "Latin", "lv": "Latvian", "lt": "Lithuanian", "lb": "Luxembourgish",
    "mk": "Macedonian", "mg": "Malagasy", "ms": "Malay", "ml": "Malayalam",
    "mt": "Maltese", "mi": "Maori", "mr": "Marathi", "mn": "Mongolian",
    "my": "Myanmar (Burmese)", "ne": "Nepali", "no": "Norwegian", "or": "Odia",
    "ps": "Pashto", "fa": "Persian", "pl": "Polish", "pt": "Portuguese",
    "pa": "Punjabi", "ro": "Romanian", "ru": "Russian", "sm": "Samoan",
    "gd": "Scots Gaelic", "sr": "Serbian", "st": "Sesotho", "sn": "Shona",
    "sd": "Sindhi", "si": "Sinhala", "sk": "Slovak", "sl": "Slovenian",
    "so": "Somali", "es": "Spanish", "su": "Sundanese", "sw": "Swahili",
    "sv": "Swedish", "tg": "Tajik", "ta": "Tamil", "te": "Telugu",
    "th": "Thai", "tr": "Turkish", "uk": "Ukrainian", "ur": "Urdu",
    "ug": "Uyghur", "uz": "Uzbek", "vi": "Vietnamese", "cy": "Welsh",
    "xh": "Xhosa", "yi": "Yiddish", "yo": "Yoruba", "zu": "Zulu",
}


class TranslationService:
    def __init__(self):
        self._client = None

    @property
    def client(self) -> translate.Client:
        if self._client is None:
            self._client = translate.Client()
        return self._client

    def detect_language(self, text: str) -> str:
        """Returns BCP-47 language code e.g. 'en', 'si'."""
        result = self.client.detect_language(text[:1000])
        return result["language"]

    def translate_text(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        """
        Translate text to target_lang.
        Splits into chunks if text is too long for one API call.
        """
        if not text.strip():
            return text

        # Split into paragraphs, group into safe chunks
        paragraphs = text.split("\n\n")
        chunks = _group_into_chunks(paragraphs, MAX_CHUNK_CHARS)

        translated_chunks = []
        for chunk in chunks:
            translated = self._translate_chunk(
                chunk,
                target=target_lang,
                source=None if source_lang == "auto" else source_lang,
            )
            translated_chunks.append(translated)

        return "\n\n".join(translated_chunks)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _translate_chunk(self, text: str, target: str, source: str | None) -> str:
        kwargs = {"target_language": target}
        if source:
            kwargs["source_language"] = source

        result = self.client.translate(text, **kwargs)
        return result["translatedText"]

    def translate_pages(
        self,
        pages: list[str],
        target_lang: str,
        source_lang: str = "auto",
        progress_callback=None,
    ) -> list[str]:
        """Translate a list of page texts with optional progress updates."""
        translated = []
        for i, page_text in enumerate(pages):
            t = self.translate_text(page_text, target_lang, source_lang)
            translated.append(t)
            if progress_callback:
                progress_callback(i + 1, len(pages))
        return translated


def _group_into_chunks(paragraphs: list[str], max_chars: int) -> list[str]:
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 > max_chars and current:
            chunks.append(current.strip())
            current = para
        else:
            current = (current + "\n\n" + para).strip()
    if current:
        chunks.append(current)
    return chunks


# Singleton
translation_service = TranslationService()
