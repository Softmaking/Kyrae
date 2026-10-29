"""Seed the exact realistic local-e2e flow. Runs INSIDE the worker image with storage mounted."""

import hashlib
import json
import os
import sys
import uuid

sys.path.insert(0, "/app/tests")

import fixtures  # noqa: E402
import psycopg  # noqa: E402

STORAGE_ROOT = os.environ["ASSISTANT_ATTACHMENT_STORAGE_ROOT"]
ACTIVE_USER = str(uuid.uuid4())
INACTIVE_USER = str(uuid.uuid4())


def connect():
    return psycopg.connect(
        host=os.environ["DB_HOST"], port=int(os.environ["DB_PORT"]),
        dbname=os.environ["DB_NAME"], user=os.environ["DB_USER"],
        password=os.environ["DB_PASS"], autocommit=True,
    )


def build_fixtures():
    return [
        {"name": "photo.png", "category": "image", "media": "image/png", "bytes": fixtures.png_bytes(),
         "owner": ACTIVE_USER, "status": "usable", "error": None},
        {"name": "photo.jpg", "category": "image", "media": "image/jpeg", "bytes": fixtures.jpeg_bytes(),
         "owner": ACTIVE_USER, "status": "usable", "error": None},
        {"name": "notes.txt", "category": "text", "media": "text/plain", "bytes": fixtures.text_fixture(),
         "owner": ACTIVE_USER, "status": "usable", "error": None},
        {"name": "data.csv", "category": "spreadsheet", "media": "text/csv", "bytes": fixtures.csv_fixture(),
         "owner": ACTIVE_USER, "status": "usable", "error": None},
        {"name": "data.tsv", "category": "spreadsheet", "media": "text/tab-separated-values",
         "bytes": fixtures.tsv_fixture(), "owner": ACTIVE_USER, "status": "usable", "error": None},
        {"name": ".env.example", "category": "text", "media": "text/plain",
         "bytes": fixtures.env_example_fixture(), "owner": ACTIVE_USER, "status": "usable", "error": None},
        {"name": ".env", "category": "text", "media": "text/plain", "bytes": fixtures.plain_env_fixture(),
         "owner": ACTIVE_USER, "status": "failed", "error": "ATTACHMENT_UNSUPPORTED_CONTENT"},
        {"name": "big.txt", "category": "text", "media": "text/plain", "bytes": fixtures.wide_text_fixture(),
         "owner": ACTIVE_USER, "status": "partial", "error": None, "truncated": True},
        {"name": "broken.heic", "category": "image", "media": "image/heic",
         "bytes": fixtures.fake_heic_header(), "owner": ACTIVE_USER, "status": "failed", "error": "ATTACHMENT_CORRUPT"},
        {"name": "report.docx", "category": "document",
         "media": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
         "bytes": fixtures.real_docx(), "owner": ACTIVE_USER, "status": "usable", "error": None},
        {"name": "sheet.xlsx", "category": "spreadsheet",
         "media": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
         "bytes": fixtures.xlsx_bytes(hidden_sheet=True), "owner": ACTIVE_USER, "status": "usable", "error": None,
         "hidden_sheet": True},
        {"name": "revoked.csv", "category": "spreadsheet", "media": "text/csv", "bytes": fixtures.csv_fixture(),
         "owner": INACTIVE_USER, "status": "failed", "error": "ATTACHMENT_ACCESS_REVOKED"},
        {"name": "draft.txt", "category": "text", "media": "text/plain", "bytes": b"draft\n",
         "owner": ACTIVE_USER, "status": "pending", "error": None, "attached": False},
    ]


def main():
    conn = connect()
    plan = build_fixtures()
    role, permission = str(uuid.uuid4()), str(uuid.uuid4())
    conn.execute(
        'INSERT INTO users (id,email,"isActive") VALUES (%s,%s,true),(%s,%s,false)',
        (ACTIVE_USER, "active@example.test", INACTIVE_USER, "inactive@example.test"),
    )
    conn.execute("INSERT INTO roles (id,name) VALUES (%s,'assistant-role')", (role,))
    conn.execute("INSERT INTO permissions (id,name) VALUES (%s,'ASSISTANT_CHAT_USE')", (permission,))
    conn.execute('INSERT INTO users_roles VALUES (%s,%s),(%s,%s)', (ACTIVE_USER, role, INACTIVE_USER, role))
    conn.execute('INSERT INTO roles_permissions VALUES (%s,%s)', (role, permission))
    agent = str(uuid.uuid4())
    conn.execute("INSERT INTO agents (id,name) VALUES (%s,'seed-agent')", (agent,))
    agents = [(ACTIVE_USER, str(uuid.uuid4())), (INACTIVE_USER, str(uuid.uuid4()))]
    for owner, conversation in agents:
        conn.execute("INSERT INTO conversations (id,user_id) VALUES (%s,%s)", (conversation, owner))
        owner_fixtures = [fixture for fixture in plan if fixture["owner"] == owner]
        batches = [owner_fixtures[i:i + 5] for i in range(0, len(owner_fixtures), 5)]
        for fixtures_chunk in batches:
            batch = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO assistant_upload_batches (id,owner_id,channel,client_batch_id,agent_id,provider)"
                " VALUES (%s,%s,'web',%s,%s,'HERMES')",
                (batch, owner, str(uuid.uuid4()), agent),
            )
            for ordinal, fixture in enumerate(fixtures_chunk):
                key = str(uuid.uuid4())
                if fixture["bytes"]:
                    with open(os.path.join(STORAGE_ROOT, key), "wb") as stream:
                        stream.write(fixture["bytes"])
                digest = hashlib.sha256()
                digest.update(fixture["bytes"])
                size = len(fixture["bytes"])
                sha = digest.hexdigest()
                attachment = str(uuid.uuid4())
                if fixture.get("attached", True):
                    message = str(uuid.uuid4())
                    conn.execute("INSERT INTO messages (id,conversation_id) VALUES (%s,%s)", (message, conversation))
                    conn.execute(
                        "INSERT INTO assistant_message_tasks (id,user_id,conversation_id,user_message_id,status)"
                        " VALUES (%s,%s,%s,%s,'pending')",
                        (str(uuid.uuid4()), owner, conversation, message),
                    )
                    conn.execute(
                        "INSERT INTO assistant_attachments (id,owner_id,batch_id,message_id,conversation_id,ordinal,"
                        "client_file_id,original_filename,byte_size,media_type,category,original_key,sha256,lifecycle)"
                        " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'attached')",
                        (attachment, owner, batch, message, conversation, ordinal, str(uuid.uuid4()),
                         fixture["name"], size, fixture["media"], fixture["category"], key, sha),
                    )
                else:
                    conn.execute(
                        "INSERT INTO assistant_attachments (id,owner_id,batch_id,client_file_id,original_filename,"
                        "byte_size,media_type,category,original_key,sha256,lifecycle)"
                        " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'ready')",
                        (attachment, owner, batch, str(uuid.uuid4()), fixture["name"], size,
                         fixture["media"], fixture["category"], key, sha),
                    )
                conn.execute(
                    "INSERT INTO assistant_attachment_jobs (kind,attachment_id,state,next_run_at)"
                    " VALUES ('process',%s,'pending',now())",
                    (attachment,),
                )
                fixture["attachment_id"] = attachment
    conn.close()
    sys.stdout.write(json.dumps({"ok": True, "seeded": len(plan),
                                 "users": {"active": ACTIVE_USER, "inactive": INACTIVE_USER}}) + "\n")


if __name__ == "__main__":
    main()
