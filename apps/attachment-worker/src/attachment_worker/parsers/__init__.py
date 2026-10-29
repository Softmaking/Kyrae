"""Category dispatch; the backend classifier is authoritative for category/media type."""

from ..errors import WorkerError

DOCUMENT_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
SPREADSHEET_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def dispatch(request, job, result, deadline, job_path):
    category = request["category"]
    media = (request["media_type"] or "").lower()
    if category == "image":
        from . import image
        image.parse(request, job, result, deadline)
        return
    if category == "document" and media == "application/pdf":
        from . import pdf
        pdf.parse(request, job, result, deadline)
        return
    if category == "document" and media == DOCUMENT_DOCX:
        from . import docx
        docx.parse(request, job, result, deadline, job_path + "/input")
        return
    if category == "spreadsheet" and media == SPREADSHEET_XLSX:
        from . import xlsx
        xlsx.parse(request, job, result, deadline, job_path + "/input")
        return
    if category in ("spreadsheet", "text", "log", "source"):
        from . import text
        text.parse(request, job, result, deadline)
        return
    raise WorkerError("ATTACHMENT_UNSUPPORTED_CONTENT")
