"""Claim, fence and publish SQL. Worker claims kind='process' only."""

from psycopg.types.json import Jsonb

from .errors import MESSAGES, WorkerError

CLAIM_PROCESS = """
UPDATE assistant_attachment_jobs j
SET state='running', attempts=j.attempts+1, generation=j.generation+1,
    lease_owner=%s, lease_until=now()+make_interval(secs=>%s), updated_at=now()
WHERE id = (
  SELECT c.id FROM assistant_attachment_jobs c
  JOIN assistant_attachments a ON a.id=c.attachment_id AND a.lifecycle='attached'
  WHERE c.kind='process' AND c.next_run_at<=now()
    AND (c.state='pending' OR (c.state='running' AND c.lease_until<now()))
  ORDER BY c.created_at, c.id
  FOR UPDATE OF c SKIP LOCKED
  LIMIT 1
)
RETURNING j.id, j.kind, j.attachment_id, j.attempts, j.generation;
"""

FETCH_ATTACHMENT = """
SELECT a.id, a.owner_id, a.original_key, a.original_filename, a.byte_size,
       a.media_type, a.category, a.sha256, a.lifecycle, a.processing_version
FROM assistant_attachments a WHERE a.id=%s;
"""

SET_PROCESSING = """
UPDATE assistant_attachments SET processing_status='processing', updated_at=now()
WHERE id=%s AND lifecycle='attached'
  AND processing_status IN ('pending','usable','partial','failed');
"""

FENCE = """
SELECT 1 FROM assistant_attachment_jobs
WHERE id=%s AND state='running' AND lease_owner=%s AND generation=%s AND lease_until>now()
FOR UPDATE;
"""

LOCK_ATTACHMENT = "SELECT lifecycle, processing_version FROM assistant_attachments WHERE id=%s FOR UPDATE;"

REPLACE_DERIVATIVES = """
DELETE FROM assistant_attachment_derivatives WHERE attachment_id=%s AND processing_version=%s;
"""

INSERT_DERIVATIVE = """
INSERT INTO assistant_attachment_derivatives
  (attachment_id, processing_version, kind, part_index, storage_key, byte_size, media_type, sha256, metadata)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s);
"""

UPDATE_ATTACHMENT = """
UPDATE assistant_attachments
SET processing_status=%s, error_code=%s, error_message=%s, coverage=%s, updated_at=now()
WHERE id=%s AND lifecycle='attached' AND processing_version=%s
RETURNING id;
"""

COMPLETE_JOB = """
UPDATE assistant_attachment_jobs
SET state='completed', error_code=NULL, lease_until=NULL, lease_owner=NULL, updated_at=now()
WHERE id=%s AND generation=%s AND lease_owner=%s AND state='running';
"""

REQUEUE_JOB = """
UPDATE assistant_attachment_jobs
SET state='pending', lease_until=NULL, lease_owner=NULL,
    next_run_at=now()+make_interval(secs=>%s), updated_at=now()
WHERE id=%s AND generation=%s AND lease_owner=%s AND state='running';
"""

FAIL_JOB = """
UPDATE assistant_attachment_jobs
SET state='failed', error_code=%s, lease_until=NULL, lease_owner=NULL, updated_at=now()
WHERE id=%s AND generation=%s AND lease_owner=%s AND state='running';
"""

ACCESS_JOIN = """
SELECT 1 FROM users u
JOIN users_roles ur ON ur."userId"=u.id
JOIN roles_permissions rp ON rp."roleId"=ur."roleId"
JOIN permissions p ON p.id=rp."permissionId"
WHERE u.id=%s AND u."isActive" AND p.name='ASSISTANT_CHAT_USE'
LIMIT 1;
"""


def claim(conn, owner, lease_seconds):
    with conn.transaction():
        rows = conn.execute(CLAIM_PROCESS, (owner, lease_seconds)).fetchall()
        if not rows:
            return None
        job = rows[0]
        attachment = conn.execute(FETCH_ATTACHMENT, (job["attachment_id"],)).fetchone()
        if attachment is None or attachment["lifecycle"] != "attached":
            # lost between job insert and claim; leave the job to expire and requeue.
            conn.execute(REQUEUE_JOB, (2, job["id"], job["generation"], owner))
            return None
        conn.execute(SET_PROCESSING, (attachment["id"],))
        return {"job": job, "attachment": attachment}


def has_access(conn, owner_id):
    return bool(conn.execute(ACCESS_JOIN, (owner_id,)).fetchall())


def requeue(conn, owner, job, backoff_seconds=2):
    updated = conn.execute(REQUEUE_JOB, (backoff_seconds, job["id"], job["generation"], owner))
    if updated.rowcount:
        conn.commit()
    return bool(updated.rowcount)


def publish(conn, job_id, owner, generation, attachment_id, attachment_version, status, coverage, derivatives, error_code=None, error_message=None):
    """All-or-nothing publication of derivative rows, coverage and job completion."""
    if status not in ("usable", "partial", "failed"):
        raise WorkerError("ATTACHMENT_PROCESSING_FAILED")
    locked = Jsonb(coverage)
    with conn.transaction():
        if not conn.execute(FENCE, (job_id, owner, generation)).fetchall():
            conn.rollback()
            return None
        row = conn.execute(LOCK_ATTACHMENT, (attachment_id,)).fetchone()
        if row is None or row["lifecycle"] != "attached" or row["processing_version"] != attachment_version:
            conn.rollback()
            return None
        conn.execute(REPLACE_DERIVATIVES, (attachment_id, attachment_version))
        for derivative in derivatives:
            conn.execute(INSERT_DERIVATIVE, (
                attachment_id, attachment_version, derivative["kind"], derivative.get("part_index", 0),
                derivative["storage_key"], derivative["byte_size"], derivative["media_type"],
                derivative["sha256"], Jsonb(derivative.get("metadata", {})),
            ))
        updated = conn.execute(
            UPDATE_ATTACHMENT,
            (status, error_code, error_message, locked, attachment_id, attachment_version),
        ).fetchall()
        if not updated:
            conn.rollback()
            return None
        finished = conn.execute(COMPLETE_JOB, (job_id, generation, owner))
        if not finished.rowcount:
            conn.rollback()
            return None
    return True


def fail(conn, job_id, owner, generation, attachment_id, attachment_version, coverage, code):
    """Terminal parsing failure that keeps the original and the job auditable."""
    return publish(
        conn, job_id, owner, generation, attachment_id, attachment_version,
        "failed", coverage, [], error_code=code,
        error_message=MESSAGES.get(code),
    )
