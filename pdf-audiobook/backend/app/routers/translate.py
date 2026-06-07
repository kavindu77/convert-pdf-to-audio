from fastapi import APIRouter
router = APIRouter()

@router.get("/languages")
async def list_languages():
    from app.services.translator import SUPPORTED_LANGUAGES
    return SUPPORTED_LANGUAGES
