"""
storage.py
──────────
Unified storage abstraction for cloud (GCS, S3) and local dev.
"""

from __future__ import annotations
import os
import uuid
import logging
from pathlib import Path
from abc import ABC, abstractmethod

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class BaseStorage(ABC):
    @abstractmethod
    async def upload(self, file_bytes: bytes, destination: str, content_type: str) -> str:
        """Upload bytes and return a public/signed URL."""

    @abstractmethod
    async def delete(self, path: str) -> None:
        """Delete a file."""

    @abstractmethod
    async def download(self, path: str) -> bytes:
        """Download and return bytes."""


class GCSStorage(BaseStorage):
    def __init__(self):
        from google.cloud import storage
        self._client = storage.Client()
        self._bucket = self._client.bucket(settings.GCS_BUCKET_NAME)

    async def upload(self, file_bytes: bytes, destination: str, content_type: str) -> str:
        blob = self._bucket.blob(destination)
        blob.upload_from_string(file_bytes, content_type=content_type)
        blob.make_public()
        return blob.public_url

    async def delete(self, path: str) -> None:
        blob = self._bucket.blob(path)
        blob.delete(if_generation_match=None)

    async def download(self, path: str) -> bytes:
        blob = self._bucket.blob(path)
        return blob.download_as_bytes()


class LocalStorage(BaseStorage):
    """For local development — stores files in ./uploads/"""

    BASE_DIR = Path("./uploads")

    def __init__(self):
        self.BASE_DIR.mkdir(parents=True, exist_ok=True)

    async def upload(self, file_bytes: bytes, destination: str, content_type: str) -> str:
        target = self.BASE_DIR / destination
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(file_bytes)
        # In local dev the API serves files at /files/...
        return f"/files/{destination}"

    async def delete(self, path: str) -> None:
        target = self.BASE_DIR / path
        if target.exists():
            target.unlink()

    async def download(self, path: str) -> bytes:
        target = self.BASE_DIR / path
        return target.read_bytes()


def get_storage() -> BaseStorage:
    backend = settings.STORAGE_BACKEND.lower()
    if backend == "gcs":
        return GCSStorage()
    elif backend == "s3":
        raise NotImplementedError("S3 storage — add boto3 implementation")
    else:
        return LocalStorage()


storage = get_storage()


def generate_storage_path(job_id: str, filename: str) -> str:
    """Generate a unique, safe storage path."""
    safe_name = "".join(c for c in filename if c.isalnum() or c in "._-")
    return f"jobs/{job_id}/{safe_name}"
