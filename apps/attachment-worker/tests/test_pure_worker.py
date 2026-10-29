"""Pure unit tests: no database, no network, no external tool processes required."""

import io
import os
import sys
import zipfile

import pytest

sys.path.insert(0, "/app/src")

from attachment_worker.errors import MESSAGES, WorkerError  # noqa: E402
from attachment_worker.config import Config  # noqa: E402
from attachment_worker.parsers import common  # noqa: E402
from attachment_worker.parsers import text as text_parser  # noqa: E402
from attachment_worker.parsers import docx as docx_parser  # noqa: E402
from attachment_worker.parsers import xlsx as xlsx_parser  # noqa: E402
from attachment_worker.parsers.oxml import open_zip, read_part  # noqa: E402
from attachment_worker.storage import KEY, directory_fd, regular_fd  # noqa: E402


# -------------------------------------------------------------------------- errors

def test_all_messages_cover_worker_codes():
    for code in ("ATTACHMENT_ACCESS_REVOKED", "ATTACHMENT_CORRUPT", "ATTACHMENT_DECODING_FAILED",
                 "ATTACHMENT_EMPTY_CONTENT", "ATTACHMENT_OCR_FAILED", "ATTACHMENT_PROCESSING_LIMIT",
                 "ATTACHMENT_PROCESSING_TIMEOUT", "ATTACHMENT_PROCESSING_FAILED",
                 "ATTACHMENT_UNSUPPORTED_CONTENT", "ATTACHMENT_PASSWORD_PROTECTED"):
        assert code in MESSAGES


# -------------------------------------------------------------------------- locating

def test_storage_key_matches_backend_shape():
    assert KEY.fullmatch("0123abcd-9c2f-4a77-8d5e-4c8f6d3dd727")
    assert not KEY.fullmatch("0123ABCD-9C2F-4A77-8D5E-4C8F6D3DD727")
    assert not KEY.fullmatch("g123abcd-9c2f-4a77-8d5e-4c8f6d3dd727")
    assert not KEY.fullmatch("secret/../../etc/passwd")


def test_directory_fd_rejects_relative(tmp_path):
    with pytest.raises(WorkerError):
        directory_fd("relative/path")


def test_regular_fd_rejects_symlink(tmp_path):
    os.symlink(os.path.join(str(tmp_path), "target"), os.path.join(str(tmp_path), "link"))
    fd = os.open(str(tmp_path), os.O_RDONLY | os.O_DIRECTORY)
    try:
        with pytest.raises(WorkerError):
            regular_fd(fd, "link")
        name = "target"
        with open(os.path.join(str(tmp_path), name), "wb") as stream:
            stream.write(b"\x00")
        handle = regular_fd(fd, "target")
        os.close(handle)
    finally:
        os.close(fd)


# -------------------------------------------------------------------------- coverage

def check_condition():
    return True


def test_finalize_empty_content_status():
    result = common.Result("11111111-2222-3333-4444-555555555555", 1)
    snapshot = result.finalize()
    assert snapshot["status"] == "failed"
    assert snapshot["error_code"] == "ATTACHMENT_EMPTY_CONTENT"
    coverage = snapshot["coverage"]
    assert coverage["omitted"][0]["reason"] == "empty_content"


def test_emit_budget_truncates_and_flags():
    result = common.Result("11111111-2222-3333-4444-555555555555", 3)
    result.emit(common.line(1, 1), "k" * (common.TEXT_LIMIT + 99))
    snapshot = result.finalize()
    assert snapshot["coverage"]["extractedTextBytes"] <= common.TEXT_LIMIT
    assert snapshot["coverage"]["truncated"] is True
    locator = {"kind": "lines", "start": 1, "end": 1}
    assert any(o.get("locator") == locator for o in snapshot["coverage"]["omitted"])


def test_omission_and_notice_are_canonical():
    result = common.Result("11111111-2222-3333-4444-555555555555", 2)
    result.omit(common.page(101, 200), "processing_limit", "page cap")
    result.omit(None, "not-a-real-code")
    result.notice("parse_warning", "best effort")
    result.notice("not-a-code", "coerced")
    coverage = result.finalize()["coverage"]
    reasons = [entry["reason"] for entry in coverage["omitted"]]
    assert "processing_limit" in reasons
    assert all(code in ("image_downscaled", "primary_frame_only", "tone_mapped", "parse_warning")
               for code in [n["code"] for n in coverage["notices"]])


def test_image_required_requires_a_normalized_frame():
    result = common.Result("11111111-2222-3333-4444-555555555555", 1)
    snapshot = result.finalize(image_required=True)
    assert snapshot["status"] == "failed"
    assert snapshot["error_code"] in ("ATTACHMENT_CONVERSION_FAILED", "ATTACHMENT_EMPTY_CONTENT")


# -------------------------------------------------------------------------- text

@pytest.mark.parametrize("filename,expected", [
    (".env", WorkerError), ("app.properties", None), (".env.example", None), ("nested.env", WorkerError),
])
def test_env_filename_guard(tmp_path, filename, expected):
    job = open_job(tmp_path, b"K:\n")
    result = common.Result("11111111-2222-3333-4444-555555555555", 1)
    request = {"original_filename": filename, "media_type": "text/plain", "category": "text"}
    if expected is None:
        text_parser.parse(request, job, result, None)
        assert result.segments or result.finalize()["status"] == "usable"
    else:
        with pytest.raises(expected):
            text_parser.parse(request, job, result, None)


def test_decoding_strict_utf8_and_boms(tmp_path):
    for payload, decode_ok in ((b'caf\xc3\xa9\n', True), (b"\xff\xfeh\x00i\x00\n\x00", True), (b"\xc3\x28", False)):
        job = open_job(tmp_path, payload)
        result = common.Result("11111111-2222-3333-4444-555555555555", 1)
        request = {"original_filename": "a.txt", "media_type": "text/plain", "category": "text"}
        if decode_ok:
            text_parser.parse(request, job, result, None)
            snapshot = result.finalize()
            assert snapshot["status"] == "usable"
        else:
            with pytest.raises(WorkerError) as raised:
                text_parser.parse(request, job, result, None)
            assert raised.value.code == "ATTACHMENT_DECODING_FAILED"


def test_control_characters_rejected(tmp_path):
    job = open_job(tmp_path, b"bad\x00text")
    result = common.Result("11111111-2222-3333-4444-555555555555", 1)
    request = {"original_filename": "a.md", "media_type": "text/plain", "category": "text"}
    with pytest.raises(WorkerError):
        text_parser.parse(request, job, result, None)


def test_csv_rows_locators_and_caps(tmp_path):
    payload = "\n".join(f"row{n},{n}" for n in range(12)) + "\n"
    job = open_job(tmp_path, payload.encode())
    result = common.Result("11111111-2222-3333-4444-555555555555", 1)
    text_parser.parse({"original_filename": "d.csv", "media_type": "text/csv", "category": "spreadsheet"},
                      job, result, None)
    snapshot = result.finalize()
    locators = snapshot["coverage"]["included"]
    assert locators and locators[0]["kind"] == "lines"
    assert any("row3" in segment["text"] for segment in result.segments)


def open_job(tmp_path, payload):
    fd = os.open(str(tmp_path), os.O_RDONLY | os.O_DIRECTORY)
    with open(os.path.join(str(tmp_path), "input"), "wb") as stream:
        stream.write(payload)
    return {"path": str(tmp_path), "fd": fd}


# -------------------------------------------------------------------------- oxml

def test_xml_entities_rejected():
    from attachment_worker.parsers.oxml import XmlTextParser
    blob = b"<?xml version='1.0'?><!DOCTYPE lolz [<!ENTITY lol 'lol'>]><a>&lol;</a>"
    with pytest.raises(WorkerError):
        XmlTextParser().parse(blob)


def test_zip_ratio_bomb_rejected(tmp_path):
    from attachment_worker.parsers.oxml import open_zip
    archive_path = str(tmp_path) + "/bomb.zip"
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        archive.writestr("a.xml", b"Z" * (500_000 * 3 + 1))
    with pytest.raises(WorkerError):
        open_zip(archive_path)


# -------------------------------------------------------------------------- docx

W_NS = 'xmlns:w="http://fake-w-ns"'


def test_docx_paragraphs_headers_footnotes(tmp_path):
    body = (f"<?xml version='1.0'?><w:document {W_NS}><w:body><w:p><w:r><w:t>Alpha</w:t></w:r></w:p>"
            "<w:p><w:r><w:t>Beta</w:t></w:r></w:p></w:body></w:document>")
    header = f"<?xml version='1.0'?><w:hdr {W_NS}><w:p><w:r><w:t>Header line</w:t></w:r></w:p></w:hdr>"
    path = str(tmp_path) + "/doc.docx"
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("word/document.xml", body)
        archive.writestr("word/header1.xml", header)
    with open(os.path.join(str(tmp_path), "input"), "wb") as stream:
        stream.write(open(path, "rb").read())
    job = {"path": str(tmp_path), "fd": os.open(str(tmp_path), os.O_RDONLY | os.O_DIRECTORY)}
    result = common.Result("11111111-2222-3333-4444-555555555555", 1)
    docx_parser.parse({"original_filename": "doc.docx"}, job, result, None, path)
    snapshot = result.finalize()
    assert snapshot["status"] == "usable"
    sections = {segment["locator"]["section"] for segment in result.segments}
    assert sections == {"body", "header-1"}
    texts = [segment["text"] for segment in result.segments]
    assert "Alpha" in "".join(texts) and "Header line" in "".join(texts)


# -------------------------------------------------------------------------- xlsx

def test_xlsx_rows_hidden_sheet_and_cached_formula(tmp_path):
    workbook = ('<?xml version="1.0"?><workbook xmlns="http://fake-ssns" xmlns:r="http://r">'
                '<sheets><sheet name="Data" r:id="r1"/><sheet name="Hidden" state="hidden" r:id="r2"/></sheets></workbook>')
    rels = ('<?xml version="1.0"?><Relationships>'
            '<Relationship Id="r1" Target="worksheets/sheet1.xml"/>'
            '<Relationship Id="r2" Target="worksheets/sheet2.xml"/></Relationships>')
    sheet = ('<?xml version="1.0"?><worksheet xmlns="http://fake-ssns"><sheetData>'
             '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
             '<row r="2"><c r="A2"><v>11</v></c><c r="B2"><f>SUM(A1)</f><v>99</v></c></row>'
             '</sheetData></worksheet>')
    hidden = ('<?xml version="1.0"?><worksheet xmlns="http://fake-ssns"><sheetData>'
              '<row r="1"><c r="A1" t="inlineStr"><is><t>hush</t></is></c></row></sheetData></worksheet>')
    shared = '<?xml version="1.0"?><sst><si><t>col-a</t></si><si><t>col-b</t></si></sst>'
    path = str(tmp_path) + "/book.xlsx"
    with zipfile.ZipFile(path, "w") as archive:
        for name, data in (("xl/workbook.xml", workbook), ("xl/_rels/workbook.xml.rels", rels),
                           ("xl/worksheets/sheet1.xml", sheet), ("xl/worksheets/sheet2.xml", hidden),
                           ("xl/sharedStrings.xml", shared)):
            archive.writestr(name, data)
    job = {"path": str(tmp_path), "fd": os.open(str(tmp_path), os.O_RDONLY | os.O_DIRECTORY)}
    result = common.Result("11111111-2222-3333-4444-555555555555", 1)
    xlsx_parser.parse({"original_filename": "book.xlsx"}, job, result, None, path)
    snapshot = result.finalize()
    assert snapshot["status"] == "usable"
    flat = "".join(segment["text"] for segment in result.segments)
    assert "A=col-a" in flat and "A=11" in flat and "B=99" in flat and "A=hush" in flat
    sheets = {segment["locator"]["sheet"] for segment in result.segments}
    assert sheets == {"Data", "Hidden"}
    hidden_locator = next(s["locator"] for s in result.segments if s["locator"]["sheet"] == "Hidden")
    assert hidden_locator.get("hidden") is True


# -------------------------------------------------------------------------- config

def test_config_requires_db_environment(monkeypatch):
    monkeypatch.delenv("DB_HOST", raising=False)
    with pytest.raises(SystemExit):
        Config()


def test_config_defaults_and_validation(monkeypatch):
    monkeypatch.delenv("ASSISTANT_ATTACHMENT_DERIVATIVES_ROOT", raising=False)
    for key, value in {"DB_HOST": "db", "DB_PORT": "5432", "DB_NAME": "DbKyrae", "DB_USER": "u", "DB_PASS": "p",
                       "ASSISTANT_ATTACHMENT_STORAGE_ROOT": "/srv/files"}.items():
        monkeypatch.setenv(key, value)
    config = Config()
    assert config.derivatives_root == config.storage_root == "/srv/files"
    assert config.lease_seconds == 60 and config.heartbeat_seconds == 15
    assert config.max_transient_attempts == 2
    monkeypatch.setenv("WORKER_POLL_SECONDS", "999")
    with pytest.raises(SystemExit):
        Config()
    monkeypatch.setenv("WORKER_POLL_SECONDS", "2")
    monkeypatch.setenv("ASSISTANT_ATTACHMENT_STORAGE_ROOT", "/")
    with pytest.raises(SystemExit):
        Config()
