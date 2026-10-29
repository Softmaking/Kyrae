"""XLSX read-only extraction: visible and hidden sheets; formula cells keep cached values."""

from ..errors import WorkerError
from . import common
from .tools import head_input
from .oxml import XmlTextParser, open_zip, read_part

MAX_SHEETS = 20
MAX_ROWS = 10_000
MAX_COLS = 100
MAX_CELLS = 100_000
FIELD_CAP = 65_536
SHARED_CAP = 32 * 1024 * 1024
WORKBOOK_PART = "xl/workbook.xml"
RELS_PART = "xl/_rels/workbook.xml.rels"
SHARED_PART = "xl/sharedStrings.xml"


class _SheetOverflow(Exception):
    """Internal: row/cell budget reached for the current sheet only."""


def parse(request, job, result, deadline, path):
    archive = open_zip(path)
    try:
        names = set(archive.namelist())
        if WORKBOOK_PART not in names:
            raise WorkerError("ATTACHMENT_CORRUPT")
        data, _ = read_part(archive, WORKBOOK_PART, 16 * 1024 * 1024)
        rels = _relationships(archive, RELS_PART, names)
        workbook = _WorkbookParser(rels)
        workbook.parse(data)
        sheets = workbook.sheets
        if not sheets and not data:
            raise WorkerError("ATTACHMENT_CORRUPT")
        shared = []
        if SHARED_PART in names:
            parser = _SharedStrings()
            blob, truncated = read_part(archive, SHARED_PART, SHARED_CAP)
            parser.parse(blob)
            shared = parser.values
            if truncated:
                result.omit(None, "processing_limit", "The shared string table was partially read.")
        hidden_notice = False
        cells = 0
        for index, sheet in enumerate(sheets[:MAX_SHEETS]):
            if sheet["target"] not in names:
                raise WorkerError("ATTACHMENT_CORRUPT")
            blob, truncated = read_part(archive, sheet["target"], 64 * 1024 * 1024)
            if truncated:
                result.omit(common.sheet(sheet["name"], 1, MAX_ROWS), "processing_limit",
                            "The worksheet exceeded the read budget and is partially represented.")
            sheet_parser = _SheetParser(result, sheet, shared, deadline)
            try:
                sheet_parser.parse(blob)
            except _SheetOverflow:
                cells = sheet_parser.cells
                if sheet_parser.omit_row is not None:
                    result.omit(common.sheet(sheet["name"], sheet_parser.omit_row, MAX_ROWS),
                                "processing_limit",
                                f"Only the first {MAX_ROWS} rows were extracted per sheet.")
                    result.truncated = True
            if sheet["hidden"] and not hidden_notice:
                result.notice("parse_warning", "Hidden worksheets are included and marked in locators.")
                hidden_notice = True
            common.check_deadline(deadline)
        if len(sheets) > MAX_SHEETS:
            result.omit(common.sheet(sheets[MAX_SHEETS]["name"], 1, MAX_ROWS), "processing_limit",
                        f"Only the first {MAX_SHEETS} sheets were extracted.")
            result.truncated = True
    finally:
        archive.close()


def _relationships(archive, part, names):
    if part not in names:
        return {}
    data, _ = read_part(archive, part, 8 * 1024 * 1024)
    parser = _Relationships()
    parser.parse(data)
    return parser.targets


class _Relationships(XmlTextParser):
    def __init__(self):
        super().__init__()
        self.targets = {}

    def on_start(self, name, attrs):
        if name == "Relationship":
            identifier = attrs.get("Id")
            target = attrs.get("Target")
            if identifier and target:
                self.targets[identifier] = target


class _WorkbookParser(XmlTextParser):
    def __init__(self, rels):
        super().__init__()
        self.rels = rels
        self.sheets = []
        self.current = None

    def on_start(self, name, attrs):
        if name == "sheet":
            rid = next((v for k, v in attrs.items() if k.endswith(":id") or k == "id"), "")
            self.current = {
                "name": attrs.get("name") or "",
                "target": self.rels.get(rid, ""),
                "hidden": attrs.get("state") in ("hidden", "veryHidden"),
            }

    def on_end(self, name):
        if name == "sheet":
            if self.current is None:
                raise WorkerError("ATTACHMENT_CORRUPT")
            target = self.current["target"]
            if target.startswith("/"):
                self.current["target"] = target[1:]
            elif target and not target.startswith("xl/"):
                self.current["target"] = "xl/" + target
            self.sheets.append(self.current)
            self.current = None


class _SharedStrings(XmlTextParser):
    def __init__(self):
        super().__init__()
        self.values = []
        self.buffer = []
        self.current = False
        self.partial = False

    def on_start(self, name, attrs):
        if name == "si":
            self.current = True
            self.buffer = []

    def on_text(self, chunk):
        if self.current:
            self.buffer.append(chunk)

    def on_end(self, name):
        if name == "si":
            value = "".join(self.buffer)[:FIELD_CAP]
            if len(self.values) < MAX_CELLS:
                self.values.append(value)
            self.current = False


class _SheetParser(XmlTextParser):
    VLUE_CONTAINERS = {"v", "t"}
    ROW = "row"
    CELL = "c"

    def __init__(self, result, sheet, shared, deadline):
        super().__init__()
        self.result = result
        self.sheet = sheet
        self.shared = shared
        self.deadline = deadline
        self.cells = 0
        self.omit_row = None
        self.over = False
        self.row = 0
        self.row_buffer = []
        self.cell_number = 0
        self.current = None

    def on_start(self, name, attrs):
        if name == self.ROW:
            self.row += 1
            self.row_buffer = []
            self.cell_number = 0
            if self.row % 500 == 0:
                common.check_deadline(self.deadline)
        elif name == self.CELL:
            reference = attrs.get("r")
            column = _column_index(reference, self.cell_number)
            self.cell_number = column
            self.current = {
                "ref": _column_address(column),
                "type": attrs.get("t", "n"),
                "value": "",
                "capture": False,
                "inside_is": False,
                "formula": False,
            }
        elif name == "f":
            if self.current is not None:
                self.current["formula"] = True
        elif name == "is":
            if self.current is not None:
                self.current["inside_is"] = True
                self.current["capture"] = True
        elif name == "v":
            if self.current is not None:
                self.current["capture"] = True

    def on_text(self, chunk):
        if self.current is not None and self.current["capture"]:
            self.current["value"] += chunk

    def on_end(self, name):
        if name == "v":
            if self.current is not None:
                self.current["capture"] = False
        elif name == "c":
            self._close_cell()
        elif name == self.ROW:
            self._close_row()
        elif name == "is":
            if self.current is not None:
                self.current["inside_is"] = False
                self.current["capture"] = False

    def _close_cell(self):
        cell = self.current
        self.current = None
        if cell is None or self.over:
            return
        self.cells += 1
        if self.cells > MAX_CELLS or self.row > MAX_ROWS:
            self.over = True
            self.omit_row = min(self.omit_row or self.row, self.row)
            raise _SheetOverflow()
        value = cell["value"]
        kind = cell["type"]
        if kind == "s" and value:
            try:
                value = self.shared[int(value)]
            except (ValueError, IndexError):
                raise WorkerError("ATTACHMENT_CORRUPT") from None
        elif kind == "b":
            value = "TRUE" if value == "1" else "FALSE" if value == "0" else value
        if cell["formula"] and not value:
            self.result.omit(common.sheet(self.sheet["name"], self.row, self.row,
                                          start_column=self.cell_number, end_column=self.cell_number),
                             "formula_cache_unavailable",
                             "One or more formula cells had no cached value; formulas are never recalculated.")
            value = "=formula"
        if len(value) > FIELD_CAP:
            self.result.notice("parse_warning", "One or more sheet cells exceeded the field budget and were truncated.")
            value = value[:FIELD_CAP]
        self.row_buffer.append(f"{cell['ref']}={value}" if value != "" else "")

    def _close_row(self):
        if self.over or not self.row_buffer:
            return
        if self.row > 1 and not any(v for v in self.row_buffer):
            return
        truncated = self.row_buffer[:MAX_COLS]
        if len(self.row_buffer) > MAX_COLS:
            self.result.notice("parse_warning", f"Columns beyond {MAX_COLS} were omitted in one or more rows.")
        if not self.result.emit(common.sheet(self.sheet["name"], self.row, self.row,
                                             hidden=self.sheet["hidden"]), "\t".join(truncated)):
            self.over = True
            self.omit_row = self.row + 1
            raise _SheetOverflow()


def _column_index(reference, fallback):
    if not reference:
        return fallback + 1
    letters = "".join(ch for ch in reference if ch.isalpha())
    if not letters:
        return fallback + 1
    index = 0
    for ch in letters.upper():
        index = index * 26 + (ord(ch) - 64)
    return index


def _column_address(index):
    letters = ""
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters or "A"
