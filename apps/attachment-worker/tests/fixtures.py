"""Fixture builders for local e2e; run inside the production-style worker image."""

import io
import uuid
import zlib


def png_bytes(width=24, height=24, rgb=(30, 90, 200)):
    def chunk(kind, data):
        crc = zlib.crc32(kind + data)
        return len(data).to_bytes(4, "big") + kind + data + crc.to_bytes(4, "big")
    header = b"\x89PNG\r\n\x1a\n"
    ihdr = width.to_bytes(4, "big") + height.to_bytes(4, "big") + bytes([8, 2, 0, 0, 0])
    row = b"\x00" + bytes(rgb) * width
    idata = zlib.compress(row * height)
    return header + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idata) + chunk(b"IEND", b"")


def jpeg_bytes(width=48, height=32):
    from PIL import Image
    image = Image.new("RGB", (width, height), (200, 90, 30))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


def text_fixture():
    return "Kyrae note\nsecond line\nthird line é accented\n".encode("utf-8")


# ~2.4 MB ASCII text; combined units exceed maxCombinedTextUtf16Units once parsed.
def wide_text_fixture():
    return (("x" * 120 + "\n") * 20_000).encode("utf-8")


def csv_fixture():
    return "id,name,value\n1,alpha,2\n2,beta,3\n".encode("utf-8")


def tsv_fixture():
    return "id\titem\n1\tuno\n2\tdos\n".encode("utf-8")


def env_example_fixture():
    return "DB_HOST=\n# harmless example\n".encode("utf-8")


def plain_env_fixture():
    return "DB_HOST=secret-host\n".encode("utf-8")


def xlsx_bytes(hidden_sheet=False):
    workbook = """<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
<row r="2"><c r="A2" t="n"><v>11</v></c><c r="B2"><f>SUM(A1)</f><v>99</v></c></row></sheetData></worksheet>"""
    hidden = """<?xml version="1.0"?><worksheet xmlns="http://xmlformats.org/spreadsheetml/2006/main">
<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>secret-hidden-sheet</t></is></c></row></sheetData></worksheet>"""
    workbook_xml = (
        '<?xml version="1.0"?><workbook xmlns="http://xmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://xmlformats.org/relationships">'
        '<sheets><sheet name="Data" sheetId="1" r:id="r1"/>'
        + ('<sheet name="Hidden" sheetId="2" state="hidden" r:id="r2"/>' if hidden_sheet else "")
        + "</sheets></workbook>"
    )
    parts = {
        "xl/workbook.xml": workbook_xml,
        "xl/_rels/workbook.xml.rels": (
            '<?xml version="1.0"?><Relationships>'
            '<Relationship Id="r1" Type="worksheet" Target="worksheets/sheet1.xml"/>'
            + ('<Relationship Id="r2" Type="worksheet" Target="worksheets/sheet2.xml"/>' if hidden_sheet else "")
            + "</Relationships>"
        ),
        "xl/worksheets/sheet1.xml": workbook,
        "xl/worksheets/sheet2.xml": hidden,
        "xl/sharedStrings.xml": "<?xml version=\"1.0\"?><sst><si><t>column-a</t></si><si><t>column-b</t></si></sst>",
    }
    buffer = io.BytesIO()
    import zipfile
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in parts.items():
            archive.writestr(name, data)
    return buffer.getvalue()


def real_docx():
    body = (
        '<?xml version="1.0"?><w:document xmlns:w="http://openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body><w:p><w:r><w:t>first paragraph</w:t></w:r></w:p>"
        "<w:p><w:r><w:t>Segundo párrafo con acentos</w:t></w:r></w:p></w:body></w:document>"
    )
    header = (
        '<?xml version="1.0"?><w:hdr xmlns:w="http://openxmlformats.org/wordprocessingml/2006/main">'
        "<w:p><w:r><w:t>header text</w:t></w:r></w:p></w:hdr>"
    )
    buffer = io.BytesIO()
    import zipfile
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", body)
        archive.writestr("word/header1.xml", header)
    return buffer.getvalue()


def fake_heic_header():
    return b"\x00\x00\x00\x18ftypheicheicmif1" + b"\x00" * 8


def new_uuid():
    return str(uuid.uuid4())
