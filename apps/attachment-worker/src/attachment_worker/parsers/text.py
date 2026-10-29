"""Text, source, config and CSV/TSV extraction. Strict UTF-8 or BOM-marked UTF-16 only."""

import csv
import io
import re

from ..errors import WorkerError
from . import common

ROWS_LIMIT = 10_000
COLS_LIMIT = 100
CELLS_LIMIT = 100_000
FIELD_LIMIT = 65_536
GROUP = 100
CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _decode(data):
    if data[:2] in (b"\xff\xfe", b"\xfe\xff"):
        try:
            return data.decode("utf-16")
        except UnicodeDecodeError:
            raise WorkerError("ATTACHMENT_DECODING_FAILED") from None
    if data[:3] == b"\xef\xbb\xbf":
        try:
            return data.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise WorkerError("ATTACHMENT_DECODING_FAILED") from None
    try:
        return data.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        raise WorkerError("ATTACHMENT_DECODING_FAILED") from None


def parse(request, job, result, deadline):
    leaf = request["original_filename"].casefold()
    if leaf.endswith(".env") and not leaf.endswith(".env.example"):
        raise WorkerError("ATTACHMENT_UNSUPPORTED_CONTENT")

    from .tools import read_input
    text = _decode(read_input(job, 20 * 1024 * 1024))
    if CONTROL.search(text):
        raise WorkerError("ATTACHMENT_DECODING_FAILED")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")
    while lines and lines[-1] == "":
        lines.pop()
    result.set_total("lines", len(lines))

    media = (request["media_type"] or "").lower()
    if media == "text/csv" or leaf.endswith(".csv"):
        _csv(job, result, deadline, text, ",")
    elif media == "text/tab-separated-values" or leaf.endswith(".tsv"):
        _csv(job, result, deadline, text, "\t")
    else:
        _lines(result, lines)


def _csv(job, result, deadline, text, delimiter):
    try:
        csv.field_size_limit(FIELD_LIMIT)
    except OverflowError:
        raise WorkerError("ATTACHMENT_PROCESSING_FAILED") from None
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    start_row, emitted, rows, cells = 0, 0, 0, 0
    chunk = []
    for row in reader:
        rows += 1
        if rows > ROWS_LIMIT:
            result.omit(common.line(ROWS_LIMIT + 1, max(rows, ROWS_LIMIT + 1)),
                        "processing_limit", f"Only the first {ROWS_LIMIT} rows were extracted.")
            result.truncated = True
            break
        cells += len(row)
        if cells > CELLS_LIMIT:
            result.omit(common.line(rows, rows), "processing_limit",
                        f"The {CELLS_LIMIT} cell budget was reached; later cells are not represented.")
            result.truncated = True
            if not chunk:
                break
        truncated_row = row
        if len(row) > COLS_LIMIT:
            result.omit(common.line(rows, rows), "processing_limit",
                        f"Columns beyond {COLS_LIMIT} were omitted in one or more rows.")
            truncated_row = row[:COLS_LIMIT]
        chunk.append("\t".join(truncated_row))
        if len(chunk) == GROUP:
            _flush(result, start_row + 1, rows, chunk)
            emitted += GROUP
            chunk = []
            start_row = rows
    if chunk:
        _flush(result, start_row + 1, rows, chunk)


def _flush(result, start, end, chunk):
    result.emit(common.line(start, end), "\n".join(chunk))


def _lines(result, lines):
    total = len(lines)
    for start in range(0, total, GROUP):
        end = min(start + GROUP, total)
        joined = "\n".join(lines[start:end])
        if not result.emit(common.line(start + 1, end), joined):
            result.omit(common.line(end + 1, total), "processing_limit",
                        "Text exceeds the extraction byte budget.")
            break
