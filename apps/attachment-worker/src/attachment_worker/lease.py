"""Single-heartbeat lease keeper for one claimed job."""

import threading

from .errors import LeaseLost


class LeaseKeeper:
    def __init__(self, conn, job_id, owner, generation, heartbeat_seconds, lease_seconds):
        self.conn = conn
        self.job_id = job_id
        self.owner = owner
        self.generation = generation
        self.interval = heartbeat_seconds
        self.lease = lease_seconds
        self.lost = threading.Event()
        self._stop = threading.Event()
        self._thread = None

    def start(self):
        self._thread = threading.Thread(target=self._run, name="lease-heartbeat", daemon=True)
        self._thread.start()

    def _run(self):
        import time
        while not self._stop.wait(self.interval):
            try:
                rows = self.conn.execute(
                    "UPDATE assistant_attachment_jobs SET lease_until=now()+make_interval(secs=>%s),"
                    "updated_at=now() WHERE id=%s AND lease_owner=%s AND generation=%s"
                    " AND state='running' AND lease_until>now() RETURNING id",
                    (self.lease, self.job_id, self.owner, self.generation),
                ).fetchall()
                self.conn.commit()
                if not rows:
                    self.lost.set()
                    return
            except Exception:
                # A single missed heartbeat is survivable (lease is 4x the interval);
                # losing the connection repeatedly ends in lease expiry, not corruption.
                continue
            if self.lost.is_set():
                return

    def stop(self):
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=self.interval + 2)

    def assert_alive(self):
        if self.lost.is_set():
            raise LeaseLost()
