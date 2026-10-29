"""Verify the local e2e flow: statuses, derivatives, jobs, coverage shape. No content printed."""

import json
import os
import re
import sys
import time

import psycopg  # noqa: E402
from psycopg.rows import dict_row  # noqa: E402

STORAGE_ROOT = os.environ.get("ASSISTANT_ATTACHMENT_STORAGE_ROOT", "/srv/attachments")
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
TEXT_LIMIT = 2 * 1024 * 1024

EXPECTATIONS = {
    "photo.png": {"status": "usable", "derivatives": {"image", "thumbnail"}, "truncated": False},
    "photo.jpg": {"status": "usable", "derivatives": {"image", "thumbnail"}, "truncated": False},
    "notes.txt": {"status": "usable", "derivatives": {"text"}, "truncated": False},
    "data.csv": {"status": "usable", "derivatives": {"text"}, "truncated": False},
    "data.tsv": {"status": "usable", "derivatives": {"text"}, "truncated": False},
    ".env.example": {"status": "usable", "derivatives": {"text"}, "truncated": False},
    ".env": {"status": "failed", "error": "ATTACHMENT_UNSUPPORTED_CONTENT", "derivatives": set(), "truncated": False},
    "big.txt": {"status": "partial", "derivatives": {"text"}, "truncated": True},
    "broken.heic": {"status": "failed", "error": "ATTACHMENT_CORRUPT", "derivatives": set(), "truncated": False},
    "report.docx": {"status": "usable", "derivatives": {"text"}, "truncated": False},
    "sheet.xlsx": {"status": "usable", "derivatives": {"text"}, "truncated": False, "hidden_notice": True},
    "revoked.csv": {"status": "failed", "error": "ATTACHMENT_ACCESS_REVOKED", "derivatives": set(), "truncated": False},
    "draft.txt": {"status": "pending", "derivatives": set()},
}


def connect():
    return psycopg.connect(
        host=os.environ["DB_HOST"], port=int(os.environ["DB_PORT"]),
        dbname=os.environ["DB_NAME"], user=os.environ["DB_USER"],
        password=os.environ["DB_PASS"], autocommit=True, row_factory=dict_row,
    )


def fetch_state(conn, filenames):
    rows = conn.execute(
        "SELECT a.original_filename AS name, a.id AS attachment_id, a.original_key,"
        " a.processing_status AS status, a.error_code, a.coverage, a.lifecycle,"
        " j.state AS job_state, j.attempts"
        " FROM assistant_attachments a"
        " LEFT JOIN assistant_attachment_jobs j ON j.attachment_id=a.id AND j.kind='process'"
        " WHERE a.original_filename = ANY(%s)",
        (sorted(filenames),),
    ).fetchall()
    return {row["name"]: row for row in rows}


def settled(state):
    for row in state.values():
        if row["status"] == "pending" and row["job_state"] == "pending":
            continue
        if row["status"] in ("usable", "partial", "failed") and row["job_state"] in ("completed",):
            continue
        if row["job_state"] == "failed" or row["job_state"] is None:
            continue
        return False
    return True


def await_settled(conn, timeout=180):
    deadline = time.monotonic() + timeout
    state = fetch_state(conn, EXPECTATIONS)
    while time.monotonic() < deadline:
        if len(state) == len(EXPECTATIONS) and settled(state):
            return state
        time.sleep(1.0)
        state = fetch_state(conn, EXPECTATIONS)
    return state


def check_row(conn, filename, expected, row):
    if row is None:
        return {"ok": False, "reason": "row missing"}
    detail = {"ok": True, "status": row["status"], "job": row["job_state"], "attempts": row["attempts"]}
    if row["status"] != expected["status"]:
        return {"ok": False, "reason": f"status {row['status']} != {expected['status']}"}
    if expected["status"] == "pending":
        if row["job_state"] != "pending" or row["attempts"]:
            return {"ok": False, "reason": "draft job was claimed"}
        if row["coverage"] is not None:
            return {"ok": False, "reason": "draft has coverage unexpectedly"}
        return detail
    if expected.get("error") and row["error_code"] != expected["error"]:
        return {"ok": False, "reason": f"error_code {row['error_code']} != {expected['error']}"}
    coverage = row["coverage"]
    if not isinstance(coverage, dict):
        return {"ok": False, "reason": "coverage missing"}
    for key in ("attachmentId", "processingVersion", "status", "summary", "totals",
                "included", "omitted", "truncated"):
        if key not in coverage:
            return {"ok": False, "reason": f"coverage missing {key}"}
    if coverage["attachmentId"] != str(row["attachment_id"]):
        return {"ok": False, "reason": "coverage attachmentId mismatch"}
    if coverage["status"] != expected["status"]:
        return {"ok": False, "reason": "coverage status mismatch"}
    if bool(coverage.get("truncated")) != expected["truncated"]:
        return {"ok": False, "reason": "truncated flag mismatch"}
    text_bytes = coverage.get("extractedTextBytes", 0)
    if text_bytes > TEXT_LIMIT:
        return {"ok": False, "reason": "extractedTextBytes over budget"}
    if coverage["status"] == "failed" and coverage.get("extractedTextBytes", 0) != 0:
        return {"ok": False, "reason": "failed coverage carried text"}
    deriv = conn.execute(
        "SELECT kind, byte_size, media_type, sha256, storage_key, metadata"
        " FROM assistant_attachment_derivatives WHERE attachment_id=%s ORDER BY kind",
        (row["attachment_id"],),
    ).fetchall()
    kinds = {d["kind"] for d in deriv}
    if kinds != expected["derivatives"]:
        return {"ok": False, "reason": f"derivative kinds {sorted(kinds)} != {sorted(expected['derivatives'])}"}
    for derivative in deriv:
        if not UUID_RE.match(derivative["storage_key"] or ""):
            return {"ok": False, "reason": "derivative key not an opaque uuid"}
        ceiling = {"image": 1024 * 1024, "thumbnail": 128 * 1024, "text": TEXT_LIMIT}[derivative["kind"]]
        if derivative["byte_size"] > ceiling or derivative["byte_size"] <= 0:
            return {"ok": False, "reason": f"{derivative['kind']} byte size out of bounds"}
        if derivative["kind"] in ("image", "thumbnail"):
            metadata = derivative["metadata"]
            if not isinstance(metadata.get("width"), int) or not isinstance(metadata.get("height"), int):
                return {"ok": False, "reason": "image metadata lacks positive integer dimensions"}
        if derivative["kind"] == "text" and derivative["byte_size"] != text_bytes:
            return {"ok": False, "reason": "text derivative size != coverage extractedTextBytes"}
    if expected.get("hidden_notice"):
        notices = coverage.get("notices") or []
        if not any(notice.get("code") == "parse_warning" for notice in notices):
            return {"ok": False, "reason": "hidden sheet notice missing"}
    if not os.path.isfile(os.path.join(STORAGE_ROOT, row["original_key"])):
        return {"ok": False, "reason": "original missing after processing"}
    return detail


def main():
    conn = connect()
    state = await_settled(conn)
    results = {}
    for filename, expected in EXPECTATIONS.items():
        results[filename] = check_row(conn, filename, expected, state.get(filename))
    failures = [name for name, detail in results.items() if not detail["ok"]]
    summary = {
        "failures": failures, "results": results,
        "note": "Real HEIC decode evidence stays in the T01 proof chain; corrupt-header rejection covered here.",
    }
    sys.stdout.write(json.dumps(summary, sort_keys=True) + "\n")
    conn.close()
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
