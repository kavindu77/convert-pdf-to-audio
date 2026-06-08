"""
tts_service.py
──────────────
Text-to-Speech using gTTS (Google TTS free endpoint).
No API key needed. Works for all languages.
"""

from __future__ import annotations
import io
import logging
import re

logger = logging.getLogger(__name__)

MAX_GTTS_CHARS = 5000

GTTS_LANG_MAP = {
    "iw": "he",
    "zh-CN": "zh",
    "zh-TW": "zh-TW",
    "jv": "jw",
}


class TTSService:
    def text_to_speech(
        self,
        text: str,
        language_code: str = "en",
        gender: str = "neutral",
        speaking_rate: float = 1.0,
    ) -> bytes:
        from gtts import gTTS

        base = language_code.split("-")[0]
        lang = GTTS_LANG_MAP.get(language_code, GTTS_LANG_MAP.get(base, base))

        chunks = _split_text(text, MAX_GTTS_CHARS)
        audio_parts = []

        for chunk in chunks:
            if not chunk.strip():
                continue
            try:
                tts = gTTS(text=chunk, lang=lang, slow=False)
                buf = io.BytesIO()
                tts.write_to_fp(buf)
                audio_parts.append(buf.getvalue())
            except Exception as e:
                logger.warning(f"gTTS failed for lang={lang}: {e}, trying English")
                try:
                    tts = gTTS(text=chunk, lang="en", slow=False)
                    buf = io.BytesIO()
                    tts.write_to_fp(buf)
                    audio_parts.append(buf.getvalue())
                except Exception as e2:
                    logger.error(f"gTTS English fallback also failed: {e2}")

        return b"".join(audio_parts)

    def list_voices(self, language_code: str = "en") -> list[dict]:
        return [{"name": "gTTS-default", "language_codes": [language_code], "gender": "neutral"}]

    def language_has_voice(self, language_code: str) -> bool:
        return True


def _split_text(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    sentences = re.split(r'(?<=[.!?।])\s+', text)
    chunks, current = [], ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 > max_chars and current:
            chunks.append(current.strip())
            current = sentence
        else:
            current = (current + " " + sentence).strip()
    if current:
        chunks.append(current)
    return chunks or [text[:max_chars]]


tts_service = TTSService()
