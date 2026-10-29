"""Process-job coordinator: poll -> claim -> parse -> fenced single-transaction publish."""

import json
import os
import shutil
import signal
import sys
import time
import uuid

from . import db, jobs
from .errors import LeaseLost, WorkerError
from .lease import LeaseKeeper
from .parsers import common
from .parsers.common import Result
from .storage import Storage, directory_fd

SCRATCH = "/tmp/attachment-worker"


def telemetry(**fields):
    def _plain(value):
        return value.hex if isinstance(value, uuid.UUID) else str(value)
    sys.stderr.write(json.dumps({"event": "attachment_job", **fields}, default=_plain, separators=(",", ":")) + "\n")
    sys.stderr.flush()


class Coordinator:
    def __init__(self, config):
        self.config = config
        self.originals = None
        self.derivatives = None
        self.conn = None
        self.heartbeat_conn = None
        self.running = True

    def start(self):
        os.makedirs(SCRATCH, mode=0o700, exist_ok=True)
        for stale in os.listdir(SCRATCH):
            shutil.rmtree(os.path.join(SCRATCH, stale), ignore_errors=True)
        self.conn = db.await_ready(self.config)
        self.heartbeat_conn = db.connect(self.config, autocommit=True)
        if self.heartbeat_conn is None:
            raise SystemExit("attachment-worker: second database connection failed")
        self.originals = Storage(self.config.storage_root)
        self.derivatives = self._derivatives(self.config.derivatives_root)
        signal.signal(signal.SIGTERM, self._stop)
        signal.signal(signal.SIGINT, self._stop)
        telemetry(worker="started", owner=self.config.owner, pid=os.getpid())

    def _stop(self, *_):
        self.running = False

    def _derivatives(self, root):
        os.makedirs(root, mode=0o700, exist_ok=True)
        return Storage(root)

    def run(self):
        while self.running:
            claimed = jobs.claim(self.conn, self.config.owner, self.config.lease_seconds)
            if claimed is None:
                time.sleep(self.config.poll_seconds)
                continue
            self.handle(claimed["job"], claimed["attachment"])
            self._reconnect_if_needed()

    def handle(self, job, attachment):
        job_id, generation = job["id"], job["generation"]
        attempts = int(job["attempts"])
        version = int(attachment["processing_version"])
        attach_id = str(attachment["id"])
        path = os.path.join(SCRATCH, str(generation) + "-" + str(job_id)[:8])
        fd = None
        started = time.monotonic()
        keeper = LeaseKeeper(self.heartbeat_conn, job_id, self.config.owner, generation,
                             self.config.heartbeat_seconds, self.config.lease_seconds)
        keeper.start()
        result = Result(attach_id, version)
        outcome, error = "completed", None
        try:
            os.mkdir(path, mode=0o700)
            fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC)
            job_dir = {"path": path, "fd": fd}
            if not jobs.has_access(self.conn, str(attachment["owner_id"])):
                raise WorkerError("ATTACHMENT_ACCESS_REVOKED")
            self.originals.copy_original(attachment, fd)
            deadline = started + self.config.job_deadline_seconds
            from .parsers import dispatch
            dispatch(attachment, job_dir, result, deadline, path)
            snapshot = result.finalize(image_required=(attachment["category"] == "image"))
            derivatives = self._materialize(path, fd, result, snapshot)
            published = jobs.publish(
                self.conn, job_id, self.config.owner, generation, attach_id, version,
                snapshot["status"], snapshot["coverage"], derivatives,
                snapshot["error_code"], snapshot["error_message"],
            )
            outcome = "published" if published is not None else "fence_lost"
        except LeaseLost:
            outcome = "lease_lost"
        except WorkerError as failure:
            error = failure
            if failure.transient and attempts < self.config.max_transient_attempts:
                jobs.requeue(self.conn, self.config.owner, job, 2)
                outcome = "requeued"
            else:
                self._fail(job_id, generation, attach_id, version, result, failure.code)
                outcome = "failed" if failure.code != "ATTACHMENT_ACCESS_REVOKED" else "revoked"
        except Exception:
            self._fail(job_id, generation, attach_id, version, result, "ATTACHMENT_PROCESSING_FAILED")
            outcome = "failed"
        finally:
            keeper.stop()
            if fd is not None:
                os.close(fd)
            shutil.rmtree(path, ignore_errors=True)
        telemetry(job_id=job_id, state=outcome, attempts=attempts,
                  code=error.code if error else None,
                  duration_ms=int((time.monotonic() - started) * 1000))

    def _fail(self, job_id, generation, attach_id, version, result, code):
        snapshot = result.finalize(error=WorkerError(code))
        jobs.fail(self.conn, job_id, self.config.owner, generation,
                  attach_id, version, snapshot["coverage"], code)

    def _materialize(self, path, fd, result, snapshot):
        """Persist derivative objects first; database rows follow in one fenced transaction."""
        derivatives = []
        if result.segments:
            common.atomic_json(os.path.join(path, "text.json"), result.segments)
            derivatives.append({
                "kind": "text", "part_index": 0, "media_type": "application/json",
                "metadata": {}, "name": "text.json", "ceiling": common.TEXT_LIMIT,
            })
        for artifact in snapshot["artifacts"]:
            derivatives.append({
                "kind": artifact["kind"], "part_index": 0, "media_type": artifact["media_type"],
                "metadata": artifact["metadata"], "name": artifact["name"],
                "ceiling": artifact["ceiling"],
            })
        objects = []
        for derivative in derivatives:
            name, ceiling = derivative.pop("name"), derivative.pop("ceiling")
            published = self.derivatives.publish(fd, name, ceiling)
            objects.append({**derivative, **published})
        return objects

    def _reconnect_if_needed(self):
        try:
            self.conn.execute("SELECT 1").fetchall()
            self.conn.commit()
            return True
        except Exception:
            try:
                self.conn.close()
            except Exception:
                pass
            time.sleep(self.config.poll_seconds)
            self.conn = db.connect(self.config)
            if self.conn is None:
                raise SystemExit("attachment-worker: connection recovery failed")
            return True
