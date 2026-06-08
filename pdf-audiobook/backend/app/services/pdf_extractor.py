"""
pdf_extractor.py
────────────────
Extracts text from PDFs.
- Text-based PDFs: uses pdfplumber (fast, accurate)
- Scanned PDFs: attempts OCR if tesseract available,
  otherwise returns a helpful message
"""

from __future__ import annotations
import io
import logging
from dataclasses import dataclass

import pdfplumber

logger = logging.getLogger(__name__)

MIN_CHARS_PER_PAGE = 50


@dataclass
class PageContent:
    page_number: int
    text: str
    is_ocr: bool


@dataclass
class ExtractionResult:
    pages: list[PageContent]
    total_pages: int
    is_scanned: bool
    word_count: int


def extract_pdf(file_bytes: bytes, target_lang: str = "eng") -> ExtractionResult:
    """Extract text from PDF. Handles text-based PDFs. Skips scanned pages gracefully."""
    pages: list[PageContent] = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        total_pages = len(pdf.pages)

        for i, page in enumerate(pdf.pages):
            text = (page.extract_text() or "").strip()
            if text and len(text) >= MIN_CHARS_PER_PAGE:
                pages.append(PageContent(
                    page_number=i + 1,
                    text=text,
                    is_ocr=False,
                ))

    # Check if PDF is scanned (no extractable text)
    is_scanned = len(pages) < (total_pages * 0.4)

    if is_scanned and len(pages) == 0:
        # Try OCR if tesseract is available
        try:
            import pytesseract
            import fitz
            from PIL import Image
            pages = _ocr_extract(file_bytes, target_lang)
            is_scanned = True
        except Exception as e:
            logger.warning(f"OCR not available: {e}")
            # Return a placeholder so the job doesn't completely fail
            pages = [PageContent(
                page_number=1,
                text="This appears to be a scanned PDF. OCR is not available on this server. Please upload a text-based PDF.",
                is_ocr=False,
            )]

    word_count = sum(len(p.text.split()) for p in pages)
    return ExtractionResult(
        pages=pages,
        total_pages=total_pages,
        is_scanned=is_scanned,
        word_count=word_count,
    )


def _ocr_extract(file_bytes: bytes, target_lang: str = "eng") -> list[PageContent]:
    """OCR extraction using Tesseract — only called if tesseract is installed."""
    import fitz
    import pytesseract
    from PIL import Image

    lang_map = {
        "si": "sin", "ta": "tam", "hi": "hin", "ar": "ara",
        "zh": "chi_sim", "ja": "jpn", "ko": "kor",
        "de": "deu", "fr": "fra", "es": "spa",
    }
    tess_lang = lang_map.get(target_lang[:2], "eng")

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages: list[PageContent] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        mat = fitz.Matrix(300 / 72, 300 / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        text = pytesseract.image_to_string(img, lang=tess_lang).strip()
        if text:
            pages.append(PageContent(page_number=page_num + 1, text=text, is_ocr=True))

    doc.close()
    return pages


def split_into_chapters(pages: list, max_chars: int = 3000) -> list[str]:
    """Group pages into chapters capped at max_chars."""
    chapters: list[str] = []
    current_chunk = ""

    for page in pages:
        text = page.text if hasattr(page, 'text') else str(page)
        if len(current_chunk) + len(text) > max_chars and current_chunk:
            chapters.append(current_chunk.strip())
            current_chunk = text
        else:
            current_chunk += "\n\n" + text

    if current_chunk.strip():
        chapters.append(current_chunk.strip())

    return chapters
