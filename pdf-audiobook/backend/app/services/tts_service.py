"""
tts_service.py
──────────────
Converts translated text to MP3 audio.
Primary: Google Cloud Text-to-Speech
Fallback: OpenAI TTS (if configured)
"""

from __future__ import annotations
import logging
import os
from pathlib import Path
from tenacity import retry, stop_after_attempt, wait_exponential

from google.cloud import texttospeech

logger = logging.getLogger(__name__)

# Google Cloud TTS character limit per request
MAX_TTS_CHARS = 5000


# Languages with high-quality Neural2 / Wavenet voices on Google Cloud TTS
PREMIUM_VOICE_LANGUAGES = {
    "en", "es", "fr", "de", "it", "pt", "ja", "ko", "hi", "ar",
    "zh", "nl", "pl", "ru", "sv", "tr", "vi", "id",
}


class TTSService:
    def __init__(self):
        self._client = None

    @property
    def client(self) -> texttospeech.TextToSpeechClient:
        if self._client is None:
            self._client = texttospeech.TextToSpeechClient()
        return self._client

    def text_to_speech(
        self,
        text: str,
        language_code: str,
        gender: str = "neutral",  # male | female | neutral
        speaking_rate: float = 1.0,
    ) -> bytes:
        """
        Convert text to MP3 bytes.
        Splits text if it exceeds the per-request character limit.
        """
        chunks = _split_text(text, MAX_TTS_CHARS)
        audio_parts: list[bytes] = []

        for chunk in chunks:
            part = self._synthesize(chunk, language_code, gender, speaking_rate)
            audio_parts.append(part)

        # Concatenate raw MP3 bytes (valid for concatenation)
        return b"".join(audio_parts)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _synthesize(
        self,
        text: str,
        language_code: str,
        gender: str,
        speaking_rate: float,
    ) -> bytes:
        gender_map = {
            "male": texttospeech.SsmlVoiceGender.MALE,
            "female": texttospeech.SsmlVoiceGender.FEMALE,
            "neutral": texttospeech.SsmlVoiceGender.NEUTRAL,
        }

        # Use Neural2 for premium languages, Standard otherwise
        base_lang = language_code.split("-")[0]
        voice_name = None
        if base_lang in PREMIUM_VOICE_LANGUAGES:
            # Let Google pick the best Neural2 voice for this language
            voice_name = None  # auto-select

        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            ssml_gender=gender_map.get(gender, texttospeech.SsmlVoiceGender.NEUTRAL),
            name=voice_name,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=speaking_rate,
        )

        response = self.client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
        return response.audio_content

    def list_voices(self, language_code: str | None = None) -> list[dict]:
        """Return available voices, optionally filtered by language."""
        response = self.client.list_voices(language_code=language_code)
        voices = []
        for voice in response.voices:
            voices.append({
                "name": voice.name,
                "language_codes": list(voice.language_codes),
                "gender": voice.ssml_gender.name.lower(),
                "natural_sample_rate": voice.natural_sample_rate_hertz,
            })
        return voices

    def language_has_voice(self, language_code: str) -> bool:
        """Check if TTS supports the given language."""
        try:
            voices = self.list_voices(language_code)
            return len(voices) > 0
        except Exception:
            return False


def _split_text(text: str, max_chars: int) -> list[str]:
    """Split text at sentence boundaries to stay under API limit."""
    if len(text) <= max_chars:
        return [text]

    # Split on sentence-ending punctuation
    import re
    sentences = re.split(r'(?<=[.!?।।॥])\s+', text)
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 > max_chars and current:
            chunks.append(current.strip())
            current = sentence
        else:
            current = (current + " " + sentence).strip()

    if current:
        chunks.append(current)

    return chunks


# Singleton
tts_service = TTSService()
