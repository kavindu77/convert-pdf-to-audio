import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel


class PlanType(str, Enum):
    free = "free"
    student = "student"
    pro = "pro"
    business = "business"


class JobStatus(str, Enum):
    pending = "pending"
    extracting = "extracting"
    translating = "translating"
    generating_audio = "generating_audio"
    completed = "completed"
    failed = "failed"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    hashed_password: Optional[str] = None
    full_name: Optional[str] = None
    plan: PlanType = Field(default=PlanType.free)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ConversionJob(SQLModel, table=True):
    __tablename__ = "conversion_jobs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)

    # Input
    original_filename: str
    source_language: str = Field(default="auto")
    target_language: str
    target_language_name: str
    voice_id: str = Field(default="default")
    voice_gender: str = Field(default="neutral")

    # Plan info at time of upload
    plan_at_upload: str = Field(default="free")
    max_pages: int = Field(default=10)

    # Processing state
    status: JobStatus = Field(default=JobStatus.pending)
    progress_percent: int = Field(default=0)
    error_message: Optional[str] = None

    # Extracted content
    total_pages: int = Field(default=0)
    processed_pages: int = Field(default=0)
    is_scanned_pdf: bool = Field(default=False)
    extracted_text_url: Optional[str] = None
    translated_text_url: Optional[str] = None

    # Output
    audio_url: Optional[str] = None
    chapter_urls: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
