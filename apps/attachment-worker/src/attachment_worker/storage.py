"""Flat UUID immutable objects. All lookups are relative to pinned directory FDs."""

import hashlib
import os
from pathlib import Path
import re
import stat
import uuid

from .errors import WorkerError

KEY = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\Z")
DIRECTORY = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC


def directory_fd(path):
    path = Path(path)
    if not path.is_absolute() or ".." in path.parts or path == Path("/"):
        raise WorkerError("ATTACHMENT_STORAGE_UNAVAILABLE")
    descriptor = os.open("/", DIRECTORY)
    try:
        for component in path.parts[1:]:
            child = os.open(component, DIRECTORY, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = child
        return descriptor
    except Exception:
        os.close(descriptor)
        raise WorkerError("ATTACHMENT_STORAGE_UNAVAILABLE") from None


def regular_fd(parent, name):
    if "/" in name or "\\" in name or name in ("", ".", ".."):
        raise WorkerError("ATTACHMENT_ORIGINAL_UNAVAILABLE")
    try:
        descriptor = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK | os.O_CLOEXEC, dir_fd=parent)
    except OSError:
        # ELOOP (symlink), ENOENT, EISDIR... all reduce to a stable original error.
        raise WorkerError("ATTACHMENT_ORIGINAL_UNAVAILABLE") from None
    if not stat.S_ISREG(os.fstat(descriptor).st_mode):
        os.close(descriptor)
        raise WorkerError("ATTACHMENT_ORIGINAL_UNAVAILABLE")
    return descriptor


def write_all(descriptor, data):
    view = memoryview(data)
    while view:
        written = os.write(descriptor, view)
        if not written:
            raise OSError("short write")
        view = view[written:]


class Storage:
    def __init__(self, root):
        self.fd = directory_fd(root)

    def close(self):
        os.close(self.fd)

    def copy_original(self, record, job_fd):
        key = record["original_key"]
        if not isinstance(key, str) or not KEY.fullmatch(key):
            raise WorkerError("ATTACHMENT_ORIGINAL_UNAVAILABLE")
        source = target = None
        try:
            source = regular_fd(self.fd, key)
            expected_size = int(record["byte_size"])
            if not 0 <= expected_size <= 20_971_520 or os.fstat(source).st_size != expected_size:
                raise WorkerError("ATTACHMENT_ORIGINAL_UNAVAILABLE")
            target = os.open("input", os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=job_fd)
            digest = hashlib.sha256()
            count = 0
            while chunk := os.read(source, 128 * 1024):
                count += len(chunk)
                if count > expected_size:
                    raise WorkerError("ATTACHMENT_ORIGINAL_UNAVAILABLE")
                digest.update(chunk)
                write_all(target, chunk)
            if count != expected_size or digest.hexdigest() != record["sha256"]:
                raise WorkerError("ATTACHMENT_ORIGINAL_UNAVAILABLE")
            os.fsync(target)
        except WorkerError:
            raise
        except OSError:
            raise WorkerError("ATTACHMENT_ORIGINAL_UNAVAILABLE", transient=True) from None
        finally:
            if source is not None:
                os.close(source)
            if target is not None:
                os.close(target)

    def publish(self, job_fd, name, ceiling):
        """fsync -> exclusive hard-link finalization -> directory fsync, no overwrite."""
        source = target = None
        key = str(uuid.uuid4())
        temporary = key + ".upload"  # Matches backend orphan reconciliation.
        try:
            source = regular_fd(job_fd, name)
            if os.fstat(source).st_size > ceiling:
                raise WorkerError("ATTACHMENT_PROCESSING_LIMIT")
            target = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=self.fd)
            digest, count = hashlib.sha256(), 0
            while data := os.read(source, 128 * 1024):
                count += len(data)
                if count > ceiling:
                    raise WorkerError("ATTACHMENT_PROCESSING_LIMIT")
                digest.update(data)
                write_all(target, data)
            os.fsync(target)
            os.close(target)
            target = None
            os.link(temporary, key, src_dir_fd=self.fd, dst_dir_fd=self.fd, follow_symlinks=False)
            os.unlink(temporary, dir_fd=self.fd)
            os.fsync(self.fd)
            return {"storage_key": key, "byte_size": count, "sha256": digest.hexdigest()}
        except WorkerError:
            raise
        except OSError:
            raise WorkerError("ATTACHMENT_STORAGE_UNAVAILABLE", transient=True) from None
        finally:
            for descriptor in (source, target):
                if descriptor is not None:
                    os.close(descriptor)
            try:
                os.unlink(temporary, dir_fd=self.fd)
            except FileNotFoundError:
                pass
