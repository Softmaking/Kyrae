"""psycopg 3 connection helpers. The worker never provisions schema."""

import psycopg
from psycopg.rows import dict_row

REQUIRED_TABLES = (
    "users", "users_roles", "roles", "roles_permissions", "permissions",
    "agents", "conversations", "messages", "assistant_message_tasks",
    "assistant_upload_batches", "assistant_attachments", "assistant_attachment_derivatives",
    "assistant_attachment_jobs", "assistant_message_submissions", "assistant_message_contexts",
)

# Column contract; absence means the deployment is not migrated for this protocol yet.
REQUIRED_COLUMNS = {
    "assistant_attachments": (
        "id", "owner_id", "original_key", "original_filename", "byte_size", "media_type",
        "category", "sha256", "lifecycle", "processing_status", "processing_version",
        "error_code", "error_message", "coverage",
    ),
    "assistant_attachment_derivatives": (
        "attachment_id", "processing_version", "kind", "part_index", "storage_key",
        "byte_size", "media_type", "sha256", "metadata",
    ),
    "assistant_attachment_jobs": (
        "id", "kind", "attachment_id", "task_id", "state", "attempts", "next_run_at",
        "lease_owner", "lease_until", "generation", "error_code",
    ),
    "users": ("id",),
    "permissions": ("name",),
    "users_roles": ("userId",),
    "roles_permissions": ("roleId",),
}


def connect(config, autocommit=False):
    try:
        conn = psycopg.connect(
            host=config.host, port=config.port, dbname=config.name,
            user=config.user, password=config.password,
            autocommit=autocommit, row_factory=dict_row,
            connect_timeout=10, application_name="kyrae-attachment-worker",
        )
    except (psycopg.OperationalError, psycopg.DatabaseError):
        # Never echo server reasons; they may embed credentials or host paths.
        return None
    conn.execute("SET TIME ZONE 'UTC'")
    return conn


def await_ready(config):
    """Poll until the schema is migrated; refuse to loop forever on missing tables."""
    import time
    last = None
    for _ in range(config.connect_attempts):
        conn = connect(config)
        if conn is not None:
            missing = [t for t in REQUIRED_TABLES if not _table_exists(conn, t)]
            if not missing:
                for table, columns in REQUIRED_COLUMNS.items():
                    present = _columns(conn, table)
                    absent = [c for c in columns if c not in present]
                    if absent:
                        conn.close()
                        raise SystemExit(f"attachment-worker: table {table} lacks protocol columns")
                _check_job_shape(conn)
                return conn
            last = ":".join(missing)
            conn.close()
        time.sleep(config.connect_interval)
    raise SystemExit(f"attachment-worker: database readiness failed after retries (last detail: {last or 'unreachable'})")


def _table_exists(conn, table):
    rows = conn.execute("SELECT to_regclass(%s) AS oid", (f"public.{table}",)).fetchone()
    return rows is not None and rows["oid"] is not None


def _columns(conn, table):
    rows = conn.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s",
        (table,)
    ).fetchall()
    return {row["column_name"] for row in rows}


def _check_job_shape(conn):
    row = conn.execute(
        "SELECT 1 FROM assistant_attachment_jobs WHERE kind='process' LIMIT 1"
    ).fetchone()
    if row is not None:
        conn.rollback()
