"""PDF text + bbox OCR. First 100 pages; first 20 OCR-needing pages at 150 dpi (<=8 MP)."""

import io
import re

from ..errors import WorkerError
from . import common
from .tools import run_tool

MAX_PAGES = 100
MAX_OCR_PAGES = 20
MAX_OCR_PIXELS = 8_000_000
OCR_DPI = 150
PAGE_TEXT_TIMEOUT = 90
OCR_TIMEOUT = 15
SPARSE = 40


def parse(request, job, result, deadline):
    info = run_tool(["pdfinfo", "input"], job, 30, 65536)
    encrypted = re.search(rb"Encrypted:\s+(yes|no)", info)
    if not encrypted:
        raise WorkerError("ATTACHMENT_CORRUPT")
    if encrypted.group(1) == b"yes":
        # Owner-password files are also refused; no copy is extracted or published.
        raise WorkerError("ATTACHMENT_PASSWORD_PROTECTED")
    pages = re.search(rb"Pages:\s+(\d+)", info)
    if not pages:
        raise WorkerError("ATTACHMENT_CORRUPT")
    total = int(pages.group(1))
    if total <= 0:
        raise WorkerError("ATTACHMENT_EMPTY_CONTENT")
    result.set_total("pages", total)
    cap = min(total, MAX_PAGES)
    if total > cap:
        result.omit(common.page(cap + 1, total), "processing_limit",
                    f"Only the first {MAX_PAGES} pages were extracted.")
    _text_pages(job, result, deadline, cap)
    _ocr_pages(job, result, deadline, cap)


def _text_pages(job, result, deadline, cap):
    encoded = run_tool(
        ["pdftotext", "-enc", "UTF-8", "-layout", "-f", "1", "-l", str(cap), "input", "doc.txt"],
        job, PAGE_TEXT_TIMEOUT, 4 * 1024 * 1024,
    )
    del encoded
    with open("doc.txt", "rb") as stream:
        document = stream.read(4 * 1024 * 1024)
    pages = document.decode("utf-8", "strict").split("\f") if document else []
    if document and len(pages) < cap:
        result.omit(None, "processing_limit", "The text extraction capacity was reached.")
    page_no = 0
    for page_text in pages[:cap]:
        page_no += 1
        if page_text.strip():
            result.emit(common.page(page_no, page_no), page_text.strip())


def _ocr_pages(job, result, deadline, cap):
    with open("doc.txt", "rb") as stream:
        document = stream.read(4 * 1024 * 1024)
    pages = document.decode("utf-8", "strict").split("\f") if document else []
    needing = []
    for number in range(1, cap + 1):
        if number <= len(pages) and len(pages[number - 1].strip()) >= SPARSE:
            continue
        needing.append(number)
    overflow = needing[MAX_OCR_PAGES:]
    if overflow:
        result.omit(common.page(overflow[0], overflow[-1]), "ocr_failed",
                    f"OCR ran on at most {MAX_OCR_PAGES} scanned pages.")
        result.truncated = True
    for number in needing[:MAX_OCR_PAGES]:
        run_tool(["pdftoppm", "-r", str(OCR_DPI), "-f", str(number), "-l", str(number),
                  "-png", "-singlefile", "input", "page"], job, 60, 1024)
        _ocr_page(job, result, number)
        _deadline(deadline)


def _ocr_page(job, result, number):
    from PIL import Image  # lazy: unit tests without Pillow skip this import path
    with open("page.png", "rb") as stream:
        image = Image.open(io.BytesIO(stream.read()))
    width, height = image.size
    image.close()
    if width * height > MAX_OCR_PIXELS or width <= 0 or height <= 0:
        result.omit(common.page(number, number), "processing_limit",
                    "The scanned page exceeded the OCR pixel budget.")
        result.truncated = True
        return
    tsv = run_tool(["tesseract", "page.png", "stdout", "-l", "eng+spa", "tsv"], job, OCR_TIMEOUT, 16 * 1024 * 1024)
    words, box, text_parts = [], None, []
    for line in tsv.decode("utf-8", "replace").splitlines()[1:]:
        parts = line.split("\t")
        if len(parts) < 12 or not parts[11].strip():
            continue
        try:
            left, top, wide, high = (int(parts[6]), int(parts[7]), int(parts[8]), int(parts[9]))
        except ValueError:
            continue
        words.append(parts[11])
        box = (left, top, wide, high) if box is None else (
            min(box[0], left), min(box[1], top), max(box[0] + box[2], left + wide),
            max(box[1] + box[3], top + high))
        text_parts.append(parts[11])
    if not words:
        result.omit(common.page(number, number), "ocr_failed")
        return
    text = " ".join(text_parts)
    region = common.region(
        max(box[0], 0) / width, max(box[1], 0) / height,
        min((box[2] - box[0]) / width, 1.0), min((box[3] - box[1]) / height, 1.0),
    )
    if not result.emit(common.page(number, number, region), text):
        result.omit(common.page(number, number, region), "processing_limit",
                    "Text exceeds the extraction byte budget.")


def _deadline(deadline):
    from time import monotonic
    if deadline is not None and monotonic() > deadline:
        raise WorkerError("ATTACHMENT_PROCESSING_TIMEOUT")
