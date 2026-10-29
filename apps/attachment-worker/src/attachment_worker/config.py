"""Environment-only configuration; never reads secret files or unrelated variables."""

import os
import uuid as _uuid
from pathlib import Path

DB_VARS = ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASS")


class Config:
    __slots__ = (
        "host", "port", "name", "user", "password", "owner", "storage_root", "derivatives_root",
        "poll_seconds", "lease_seconds", "heartbeat_seconds", "max_transient_attempts",
        "connect_attempts", "connect_interval", "job_deadline_seconds", "cpu_seconds",
    )

    def __init__(self):
        self.host = os.environ.get("DB_HOST", "")
        try:
            self.port = int(os.environ.get("DB_PORT", "5432"))
        except ValueError as e:
            raise SystemExit("attachment-worker: DB_PORT must be an integer") from e
        self.name = os.environ.get("DB_NAME", "")
        self.user = os.environ.get("DB_USER", "")
        self.password = os.environ.get("DB_PASS", "")
        missing = [v for v in DB_VARS if not os.environ.get(v) and v != "DB_PORT"]
        if missing:
            raise SystemExit(f"attachment-worker: missing required database variables: {','.join(missing)}")
        if not 1 <= self.port <= 65535:
            raise SystemExit("attachment-worker: DB_PORT out of range")
        self.owner = str(_uuid.uuid4())  # Lease owner identity; value has no meaning to the backend.
        self.storage_root = os.environ.get("ASSISTANT_ATTACHMENT_STORAGE_ROOT", "")
        # PROTOCOL.md: original and derivative keys are flat inside the same private root.
        self.derivatives_root = self.storage_root
        self.poll_seconds = _bound("WORKER_POLL_SECONDS", 2.0, 0.2, 60)
        self.lease_seconds = _bound("WORKER_LEASE_SECONDS", 60, 15, 600)
        self.heartbeat_seconds = _bound("WORKER_HEARTBEAT_SECONDS", 15, 1, self.lease_seconds)
        self.max_transient_attempts = _bound("WORKER_MAX_TRANSIENT_ATTEMPTS", 2, 1, 2)
        self.connect_attempts = _bound("WORKER_CONNECT_ATTEMPTS", 60, 1, 1000)
        self.connect_interval = _bound("WORKER_CONNECT_INTERVAL_SECONDS", 5.0, 0.5, 60)
        self.job_deadline_seconds = _bound("WORKER_JOB_DEADLINE_SECONDS", 120, 30, 3600)
        self.cpu_seconds = _bound("WORKER_CPU_SECONDS", 60, 1, 3600)
        for var, root in (("ASSISTANT_ATTACHMENT_STORAGE_ROOT", self.storage_root),):
            path = Path(root) if root else None
            if not path or not path.is_absolute() or path == Path("/") or ".." in path.parts:
                raise SystemExit(f"attachment-worker: {var} must be an absolute private directory path")
            if len(path.parts) < 2:
                raise SystemExit(f"attachment-worker: {var} must not be the filesystem root")
        if self.heartbeat_seconds >= self.lease_seconds:
            raise SystemExit("attachment-worker: WORKER_HEARTBEAT_SECONDS must be shorter than the lease")


def _bound(name, default, minimum, maximum):
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    try:
        value = float(raw)
    except ValueError as e:
        raise SystemExit(f"attachment-worker: {name} must be a number") from e
    if not minimum <= value <= maximum:
        raise SystemExit(f"attachment-worker: {name} out of range")
    return value


def load_config():
    return Config()
