from fastapi import APIRouter
router = APIRouter()

@router.get("/voices")
async def list_voices(language_code: str = "en"):
    from app.services.tts_service import tts_service
    return tts_service.list_voices(language_code)
