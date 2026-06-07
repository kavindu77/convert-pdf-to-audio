-- ── 001_init.sql ─────────────────────────────────────────────
-- Run automatically by Docker postgres on first start

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE plan_type AS ENUM ('free', 'student', 'pro', 'business');
CREATE TYPE job_status AS ENUM (
  'pending', 'extracting', 'translating', 'generating_audio', 'completed', 'failed'
);

CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email            VARCHAR(255) UNIQUE NOT NULL,
    hashed_password  TEXT,
    full_name        VARCHAR(255),
    plan             plan_type NOT NULL DEFAULT 'free',
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS conversion_jobs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
    original_filename    VARCHAR(500) NOT NULL,
    source_language      VARCHAR(20) NOT NULL DEFAULT 'auto',
    target_language      VARCHAR(20) NOT NULL,
    target_language_name VARCHAR(100) NOT NULL,
    voice_id             VARCHAR(100) NOT NULL DEFAULT 'default',
    voice_gender         VARCHAR(20) NOT NULL DEFAULT 'neutral',
    status               job_status NOT NULL DEFAULT 'pending',
    progress_percent     INTEGER NOT NULL DEFAULT 0,
    error_message        TEXT,
    total_pages          INTEGER NOT NULL DEFAULT 0,
    processed_pages      INTEGER NOT NULL DEFAULT 0,
    is_scanned_pdf       BOOLEAN NOT NULL DEFAULT FALSE,
    extracted_text_url   TEXT,
    translated_text_url  TEXT,
    audio_url            TEXT,
    chapter_urls         TEXT,    -- JSON array
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMPTZ
);

CREATE INDEX idx_jobs_user_id ON conversion_jobs(user_id);
CREATE INDEX idx_jobs_status  ON conversion_jobs(status);
CREATE INDEX idx_jobs_created ON conversion_jobs(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON conversion_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
