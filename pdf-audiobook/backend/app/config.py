from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Google Cloud
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    GOOGLE_CLOUD_PROJECT: str = ""

    # Storage
    STORAGE_BACKEND: str = "local"  # gcs | s3 | local
    GCS_BUCKET_NAME: str = ""

    # OpenAI (optional)
    OPENAI_API_KEY: str = ""

    # ElevenLabs (optional)
    ELEVENLABS_API_KEY: str = ""

    # Plan limits (pages)
    MAX_FREE_PAGES: int = 5
    MAX_STUDENT_PAGES: int = 50
    MAX_FILE_SIZE_MB: int = 50

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
