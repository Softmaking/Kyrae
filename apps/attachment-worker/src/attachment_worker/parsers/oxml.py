"""Bounded zipfile + expat (no entity expansion, no external references)."""

import zipfile
from xml.parsers import expat

from ..errors import WorkerError

MAX_ENTRIES = 10_000
MAX_BYTES = 256 * 1024 * 1024
MAX_RATIO = 100


def open_zip(path):
    try:
        archive = zipfile.ZipFile(path)
    except (zipfile.BadZipFile, OSError):
        raise WorkerError("ATTACHMENT_CORRUPT") from None
    try:
        infos = archive.infolist()
        total = 0
        if len(infos) > MAX_ENTRIES:
            raise WorkerError("ATTACHMENT_PROCESSING_LIMIT")
        for info in infos:
            total += info.file_size
            if info.compress_size and info.file_size // info.compress_size > MAX_RATIO:
                raise WorkerError("ATTACHMENT_PROCESSING_LIMIT")
            if total > MAX_BYTES:
                raise WorkerError("ATTACHMENT_PROCESSING_LIMIT")
    except WorkerError:
        archive.close()
        raise
    except (OSError, zipfile.BadZipFile):
        archive.close()
        raise WorkerError("ATTACHMENT_CORRUPT") from None
    return archive


def read_part(archive, name, cap):
    try:
        with archive.open(name) as stream:
            chunks, size, truncated = [], 0, False
            while True:
                chunk = stream.read(64 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > cap:
                    truncated = True
                    break
                chunks.append(chunk)
            return b"".join(chunks), truncated
    except (KeyError, zipfile.BadZipFile, OSError):
        raise WorkerError("ATTACHMENT_CORRUPT") from None


class XmlTextParser:
    """Expat event hooks; subclass overrides on_start/on_end/on_text. No DTD expansion."""

    def __init__(self, ignore_truncation=False):
        self.ignore_truncation = ignore_truncation

    def parse(self, data):
        parser = expat.ParserCreate()
        parser.EntityDeclHandler = self._reject_entity
        parser.ExternalEntityRefHandler = self._reject_external
        parser.StartElementHandler = self._on_start
        parser.EndElementHandler = self._on_end
        parser.CharacterDataHandler = self._on_text
        try:
            parser.Parse(data, True)
        except expat.ExpatError:
            if not self.ignore_truncation:
                raise WorkerError("ATTACHMENT_CORRUPT") from None
        except WorkerError:
            raise
        except Exception:
            raise WorkerError("ATTACHMENT_PROCESSING_FAILED") from None

    def _reject_entity(self, *args):
        raise WorkerError("ATTACHMENT_CORRUPT")  # DTDs and entity expansion are rejected outright.

    def _reject_external(self, *args):
        raise WorkerError("ATTACHMENT_CORRUPT")

    def _on_start(self, name, attrs):
        self.on_start(name, attrs or {})

    def _on_end(self, name):
        self.on_end(name)

    def _on_text(self, data):
        self.on_text(data)

    def on_start(self, name, attrs):
        pass

    def on_end(self, name):
        pass

    def on_text(self, data):
        pass
