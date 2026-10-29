"""DOCX paragraphs, headers/footers, footnotes/endnotes and textboxes via stdlib zip+XML."""

import os
import re

from ..errors import WorkerError
from . import common
from .tools import head_input
from .oxml import XmlTextParser, open_zip, read_part

DOCUMENT_PART_CAP = 64 * 1024 * 1024
OTHER_PART_CAP = 16 * 1024 * 1024
MAX_EXTRA_PARTS = 12
OLE2 = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"

PART_RE = re.compile(r"word/(header|footer)\d*\.xml|word/(footnotes|endnotes)\.xml\Z")


def parse(request, job, result, deadline, path):
    if head_input(job, 8) == OLE2:
        raise WorkerError("ATTACHMENT_PASSWORD_PROTECTED")
    archive = open_zip(path)
    try:
        parts = [("body", "word/document.xml", DOCUMENT_PART_CAP)]
        extra = sorted(n for n in archive.namelist() if PART_RE.search(n))[:MAX_EXTRA_PARTS]
        for name in extra:
            base = os.path.basename(name)
            label = ("header" if base.startswith("header") else
                     "footer" if base.startswith("footer") else
                     "footnotes" if base.startswith("footnotes") else "endnotes")
            suffix = re.sub(r"\D", "", base) or "1"
            parts.append((f"{label}-{suffix}" if label in ("header", "footer") else label, name, OTHER_PART_CAP))
        for section, name, cap in parts:
            common.check_deadline(deadline)
            data, truncated = read_part(archive, name, cap)
            _part(result, section, data, truncated)
    finally:
        archive.close()


def _part(result, section, data, truncated):
    extractor = _Extractor(section, result, truncated)
    extractor.parse(data)


class _Extractor(XmlTextParser):
    W = "w:"
    TEXT_TAGS = {W + "t"}
    TABS = {W + "tab"}
    BREAKS = {W + "br"}
    PARAS = {W + "p"}
    CELLS = {W + "tc"}

    def __init__(self, section, result, truncated):
        super().__init__(ignore_truncation=truncated)
        self.section = section
        self.result = result
        self.buffer = []
        self.size = 0
        self.para = 0
        self.in_cell = False
        if truncated:
            self.result.omit(common.document(section, 1, 1), "processing_limit",
                             "The part exceeded the read budget and is partially represented.")

    def on_start(self, name, attrs):
        if name in self.CELLS:
            self.in_cell = True
        elif name in self.TABS:
            self._text("\t")
        elif name in self.BREAKS:
            self._text("\n")

    def on_end(self, name):
        if name in self.CELLS:
            self.in_cell = False
        elif name in self.PARAS:
            self._flush()

    def on_text(self, chunk):
        self._text(chunk)

    def _text(self, value):
        if not value:
            return
        self.buffer.append(value if not self.in_cell else value)
        self.size += len(value)
        if self.size > 2 * 1024 * 1024:
            self._flush(with_omission=True)
            raise WorkerError("ATTACHMENT_PROCESSING_LIMIT")

    def _flush(self, with_omission=False):
        text = "".join(self.buffer).strip()
        self.buffer.clear()
        self.size = 0
        if text:
            self.para += 1
            ok = self.result.emit(common.document(self.section, self.para, self.para), text)
            if not ok:
                self.result.truncated = True
