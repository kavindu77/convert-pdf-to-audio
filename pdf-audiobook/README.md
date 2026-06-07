# PDF Audiobook

Convert any PDF into a translated audiobook in 100+ languages.

**Upload PDF → Extract text → Translate → Generate natural audio → Download MP3**

---

## Features

- Text-based and scanned PDFs (OCR)
- 100+ languages via Google Cloud Translate
- Natural voice audio via Google Cloud TTS
- Chapter-by-chapter audio generation
- JWT authentication with user history
- Async processing via Celery + Redis
- Docker Compose for one-command local setup
- Production-ready FastAPI + Next.js stack

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Google Cloud project with these APIs enabled:
  - Cloud Translation API
  - Cloud Text-to-Speech API
  - Cloud Vision API (for OCR)
- A GCS bucket (or use `local` storage for dev)

### 1. Clone and configure

```bash
git clone https://github.com/yourname/pdf-audiobook.git
cd pdf-audiobook

cp .env.example .env
# Edit .env and fill in your real keys
```

### 2. Start everything

```bash
docker compose up --build
```

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:3000        |
| Backend  | http://localhost:8000        |
| API docs | http://localhost:8000/api/docs |
| Celery   | http://localhost:5555 (Flower) |

### 3. Test the API

```bash
# Health check
curl http://localhost:8000/api/health

# Upload a PDF
curl -X POST http://localhost:8000/api/upload/pdf \
  -F "file=@sample.pdf" \
  -F "target_language=es" \
  -F "voice_gender=female"

# Poll job status
curl http://localhost:8000/api/jobs/<job_id>
```

---

## Architecture

```
Browser
  └─ Next.js (Vercel)
       └─ FastAPI (Cloud Run / Railway)
            ├─ PostgreSQL (Supabase)
            ├─ Redis (Upstash)
            └─ Celery Worker
                 ├─ pdfplumber / PyMuPDF (extraction)
                 ├─ Tesseract OCR (scanned PDFs)
                 ├─ Google Cloud Translate
                 ├─ Google Cloud TTS
                 └─ GCS / S3 (file storage)
```

---

## Development

### Backend only

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start API
uvicorn app.main:app --reload --port 8000

# Start worker (separate terminal)
celery -A worker.tasks worker --loglevel=info
```

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

### Tests

```bash
cd backend
pytest tests/ -v --cov=app
```

---

## Environment Variables

See `.env.example` for all options with descriptions.

**Required:**
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key (`openssl rand -hex 32`)
- `GOOGLE_APPLICATION_CREDENTIALS` — path to GCP service account JSON

**Optional:**
- `OPENAI_API_KEY` — for OpenAI TTS fallback
- `ELEVENLABS_API_KEY` — for premium voices

---

## Supported Languages

100+ languages including English, Spanish, French, German, Arabic, Hindi, Chinese, Japanese, Korean, Sinhala, Tamil, Bengali, Urdu, Nepali, and more. See `/api/translate/languages` for the full list.

---

## Deployment

### Backend → Railway / Render / Cloud Run

1. Set all env vars in your platform dashboard
2. Deploy from `./backend` with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Deploy worker separately with `celery -A worker.tasks worker`

### Frontend → Vercel

1. Connect your GitHub repo to Vercel
2. Set `NEXT_PUBLIC_API_URL` to your backend URL
3. Deploy

---

## License

MIT
