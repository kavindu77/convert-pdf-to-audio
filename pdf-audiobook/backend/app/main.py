from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database import init_db
from app.routers import auth, upload, translate, tts, jobs

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="PDF Audiobook API",
    version="1.0.0",
    description="Convert PDFs to translated audiobooks",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS — allow everything ───────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])
app.include_router(upload.router,    prefix="/api/upload",    tags=["upload"])
app.include_router(translate.router, prefix="/api/translate", tags=["translate"])
app.include_router(tts.router,       prefix="/api/tts",       tags=["tts"])
app.include_router(jobs.router,      prefix="/api/jobs",      tags=["jobs"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
async def root():
    return {"message": "PDF Audiobook API is running. Visit /api/docs for documentation."}