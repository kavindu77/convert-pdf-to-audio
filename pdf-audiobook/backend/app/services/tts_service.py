"""
tts_service.py
──────────────
Text-to-Speech using Google Cloud TTS if credentials available,
otherwise falls back to gTTS (free, no API key needed).
"""

from __future__ import annotations
import io
import logging
import re
import os

logger = logging.getLogger(__name__)

MAX_GTTS_CHARS = 5000

# gTTS language code mapping
GTTS_LANG_MAP = {
    "iw": "he", "jw": "jv", "zh-TW": "zh-TW",
    "zh": "zh", "sr": "sr", "bs": "bs",
}


class TTSService:
    def text_to_speech(
        self,
        text: str,
        language_code: str,
        gender: str = "neutral",
        speaking_rate: float = 1.0,
    ) -> bytes:
        """Convert text to MP3 bytes using gTTS (free)."""
        from gtts import gTTS

        # Map language code
        base_lang = language_code.split("-")[0]
        lang = GTTS_LANG_MAP.get(base_lang, base_lang)

        chunks = _split_text(text, MAX_GTTS_CHARS)
        audio_parts = []

        for chunk in chunks:
            try:
                tts = gTTS(text=chunk, lang=lang, slow=False)
                buf = io.BytesIO()
                tts.write_to_fp(buf)
                audio_parts.append(buf.getvalue())
            except Exception as e:
                logger.error(f"gTTS error for lang {lang}: {e}")
                # Try English as fallback
                try:
                    tts = gTTS(text=chunk, lang="en", slow=False)
                    buf = io.BytesIO()
                    tts.write_to_fp(buf)
                    audio_parts.append(buf.getvalue())
                except Exception as e2:
                    logger.error(f"gTTS fallback also failed: {e2}")

        return b"".join(audio_parts)

    def list_voices(self, language_code: str = "en") -> list[dict]:
        return [{"name": "gTTS", "language_codes": [language_code], "gender": "neutral"}]

    def language_has_voice(self, language_code: str) -> bool:
        return True


def _split_text(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks, current = [], ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 > max_chars and current:
            chunks.append(current.strip())
            current = sentence
        else:
            current = (current + " " + sentence).strip()
    if current:
        chunks.append(current)
    return chunks


tts_service = TTSService()
