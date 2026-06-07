"""
pdf_extractor.py
────────────────
Handles two PDF types:
  1. Text-based PDFs  → pdfplumber (fast, accurate)
  2. Scanned PDFs     → PyMuPDF renders to image → Tesseract OCR
"""

from __future__ import annotations
import io
import logging
from dataclasses import dataclass
from pathlib import Path

import pdfplumber
import fitz  # PyMuPDF
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)

# Threshold: if fewer than this many chars per page → treat as scanned
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
    """
    Main entry point. Detects if PDF is text-based or scanned
    and routes accordingly.
    """
    pages: list[PageContent] = []

    # First pass: try text extraction
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        total_pages = len(pdf.pages)
        text_pages = []

        for i, page in enumerate(pdf.pages):
            text = (page.extract_text() or "").strip()
            text_pages.append((i + 1, text))

    # Determine if PDF is scanned (mostly empty pages)
    non_empty = sum(1 for _, t in text_pages if len(t) >= MIN_CHARS_PER_PAGE)
    is_scanned = non_empty < (total_pages * 0.4)

    if is_scanned:
        logger.info("Detected scanned PDF — switching to OCR")
        pages = _ocr_extract(file_bytes, target_lang)
    else:
        pages = [
            PageContent(page_number=n, text=t, is_ocr=False)
            for n, t in text_pages
            if t  # skip completely blank pages
        ]

    word_count = sum(len(p.text.split()) for p in pages)
    return ExtractionResult(
        pages=pages,
        total_pages=total_pages,
        is_scanned=is_scanned,
        word_count=word_count,
    )


def _ocr_extract(file_bytes: bytes, target_lang: str = "eng") -> list[PageContent]:
    """Render each PDF page to an image and OCR it."""
    # Map target language to Tesseract lang code
    lang_map = {
        "si": "sin",  # Sinhala
        "ta": "tam",  # Tamil
        "hi": "hin",  # Hindi
        "ar": "ara",  # Arabic
        "zh": "chi_sim",
        "ja": "jpn",
        "ko": "kor",
        "de": "deu",
        "fr": "fra",
        "es": "spa",
        "pt": "por",
        "ru": "rus",
    }
    tess_lang = lang_map.get(target_lang[:2], "eng")

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages: list[PageContent] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        # Render at 300 DPI for good OCR accuracy
        mat = fitz.Matrix(300 / 72, 300 / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        text = pytesseract.image_to_string(img, lang=tess_lang)
        text = text.strip()

        if text:
            pages.append(PageContent(
                page_number=page_num + 1,
                text=text,
                is_ocr=True,
            ))

    doc.close()
    return pages


def split_into_chapters(pages: list[PageContent], max_chars: int = 3000) -> list[str]:
    """
    Group pages into chapters capped at max_chars.
    Returns list of text chunks suitable for TTS.
    """
    chapters: list[str] = []
    current_chunk = ""

    for page in pages:
        if len(current_chunk) + len(page.text) > max_chars and current_chunk:
            chapters.append(current_chunk.strip())
            current_chunk = page.text
        else:
            current_chunk += "\n\n" + page.text

    if current_chunk.strip():
        chapters.append(current_chunk.strip())

    return chapters
