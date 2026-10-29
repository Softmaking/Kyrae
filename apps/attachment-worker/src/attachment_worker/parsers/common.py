"""Canonical AttachmentCoverageDto / AttachmentSourceLocator / segment builders.

Byte budget for text: 2 MiB of UTF-8 JSON. Every emitted segment is only ever
extracted content; omissions and notices are contract codes, never raw text.
"""

import json
import os
import time

from ..errors import MESSAGES, WorkerError


def check_deadline(deadline):
    if deadline is not None and time.monotonic() > deadline:
        raise WorkerError("ATTACHMENT_PROCESSING_TIMEOUT")

TEXT_LIMIT = 2 * 1024 * 1024
REASONS = {
    "processing_limit", "processing_failed", "processing_timeout", "empty_content",
    "unreadable_content", "unsupported_content", "unsupported_encoding",
    "unsupported_language", "ocr_failed", "conversion_failed", "context_budget",
    "request_byte_limit", "text_unit_limit", "history_budget", "capability_unavailable",
    "source_unavailable", "not_selected", "unknown_extent", "additional_frames",
    "formula_cache_unavailable",
}
NOTICE_CODES = {"image_downscaled", "primary_frame_only", "tone_mapped", "parse_warning"}


def encoded(value):
    # JSON is an internal derivative container; HTML-escape keeps it inert if any
    # future consumer embeds it verbatim.
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":")) \
        .replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026").encode("utf-8")


def atomic_json(path, value):
    data = encoded(value)
    temporary = path + ".new"
    with open(temporary, "wb") as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)


def page(start, end, region=None):
    locator = {"kind": "pages", "start": start, "end": end}
    if region is not None:
        locator["region"] = region
    return locator


def line(start, end):
    return {"kind": "lines", "start": start, "end": end}


def sheet(name, start_row, end_row, start_column=None, end_column=None, hidden=False):
    locator = {"kind": "sheet", "sheet": name, "startRow": start_row, "endRow": end_row}
    if start_column is not None:
        locator["startColumn"] = start_column
    if end_column is not None:
        locator["endColumn"] = end_column
    if hidden:
        locator["hidden"] = True
    return locator


def document(section, start, end):
    return {"kind": "document", "section": section, "start": start, "end": end}


def image(frame):
    return {"kind": "image", "frame": frame}


def region(x, y, width, height):
    return {
        "x": round(float(x), 4), "y": round(float(y), 4),
        "width": round(float(width), 4), "height": round(float(height), 4),
    }


def _check_locator(locator):
    if not isinstance(locator, dict) or locator.get("kind") not in ("pages", "lines", "sheet", "document", "image"):
        raise WorkerError("ATTACHMENT_PROCESSING_FAILED")
    return locator


class Result:
    """Per-file extraction state; every parser mutates one instance."""

    def __init__(self, attachment_id, processing_version):
        self.attachment_id = attachment_id
        self.processing_version = processing_version
        self.segments = []
        self.text_bytes = 2  # JSON array brackets.
        self.artifacts = []  # {"kind","name","media_type","metadata","ceiling"}
        self.totals = []
        self.included = []
        self.omitted = []
        self.notices = []
        self.truncated = False
        self.last_checkpoint = time.monotonic()

    # -- coverage ----------------------------------------------------------
    def set_total(self, unit, total, sheet_name=None):
        entry = {"unit": unit, "total": total}
        if sheet_name is not None:
            entry["sheet"] = sheet_name
        self.totals = [t for t in self.totals if not (t["unit"] == unit and t.get("sheet") == entry.get("sheet"))]
        self.totals.append(entry)

    def omit(self, locator=None, reason="processing_limit", message=None):
        if reason not in REASONS:
            reason = "processing_failed"
        omission = {"locator": None if locator is None else _check_locator(locator), "reason": reason}
        if message:
            omission["message"] = str(message)[:300]
        if omission not in self.omitted:
            self.omitted.append(omission)
        if reason in ("processing_limit", "processing_timeout", "unknown_extent", "additional_frames"):
            self.truncated = True

    def notice(self, code, message):
        if code not in NOTICE_CODES:
            code = "parse_warning"
        value = {"code": code, "message": str(message)[:300]}
        if value not in self.notices:
            self.notices.append(value)

    # -- text segments -----------------------------------------------------
    def emit(self, locator, text):
        if not text or not text.strip():
            return True
        value = {"locator": locator, "text": text}
        remaining = TEXT_LIMIT - self.text_bytes - (1 if self.segments else 0)
        if len(encoded(value)) <= remaining:
            self._append(locator, text)
            return True
        lo, hi = 0, len(text)
        while lo < hi:
            middle = (lo + hi + 1) // 2
            if len(encoded({"locator": locator, "text": text[:middle]})) <= remaining:
                lo = middle
            else:
                hi = middle - 1
        if lo:
            self._append(locator, text[:lo])
        self.omit(locator, "processing_limit", "Text exceeds the extraction byte budget.")
        return False

    def _append(self, locator, text):
        if not text.strip():
            return
        value = {"locator": locator, "text": text}
        size = len(encoded(value)) + (1 if self.segments else 0)
        self.text_bytes += size
        self.segments.append(value)
        self.included.append(_check_locator(locator))

    # -- artifacts ---------------------------------------------------------
    def artifact(self, kind, name, media_type, metadata=None, ceiling=None):
        if kind not in ("text", "image", "thumbnail"):
            raise WorkerError("ATTACHMENT_PROCESSING_FAILED")
        self.artifacts.append({
            "kind": kind, "name": name, "media_type": media_type,
            "metadata": metadata or {}, "ceiling": ceiling or TEXT_LIMIT,
        })

    def image_part(self):
        return any(a["kind"] == "image" for a in self.artifacts)

    # -- checkpoints -------------------------------------------------------
    def checkpoint(self):
        if time.monotonic() - self.last_checkpoint >= 5:
            self.last_checkpoint = time.monotonic()

    # -- publication -------------------------------------------------------
    def finalize(self, error=None, image_required=False, checkpoint=False):
        """Build the canonical DTO snapshot the coordinator publishes."""
        if checkpoint:
            self.omit(None, "processing_timeout", "Only completed segments were retained before interruption.")
        usable = bool(self.segments) or self.image_part() if not image_required else self.image_part()
        if not self.segments and not self.image_part():
            self.omit(None, "empty_content" if error is None else "processing_failed",
                      None if error else "No usable content could be extracted.")
            if error is None:
                error = WorkerError("ATTACHMENT_EMPTY_CONTENT")
        status = "failed" if not usable else ("partial" if self.omitted or error is not None or checkpoint else "usable")
        code = error.code if error is not None else None
        coverage = {
            "attachmentId": self.attachment_id,
            "processingVersion": self.processing_version,
            "status": status,
            "summary": "Content is available with explicit omissions or notices."
            if status == "partial" else
            "Content was extracted within processing bounds."
            if status == "usable" else
            "No usable content was extracted; the original remains downloadable."
            if code in ("ATTACHMENT_EMPTY_CONTENT",) else
            "Processing failed without removing the original.",
            "totals": self.totals,
            "included": self.included,
            "omitted": self.omitted,
            "truncated": self.truncated,
            "extractedTextBytes": len(encoded(self.segments)) if status != "failed" else 0,
        }
        if self.notices:
            coverage["notices"] = self.notices
        return {"status": status, "error_code": code,
                "error_message": MESSAGES.get(code) if code else None,
                "coverage": coverage, "artifacts": list(self.artifacts)}
