#!/usr/bin/env bash
# Local e2e: ephemeral postgres:18 + production worker image + real flow assertions.
# Usage: apps/attachment-worker/tools/run_local_e2e.sh [image-tag]
set -euo pipefail

IMAGE="${1:-kyrae-attachment-e2e:local}"
CTX="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d /tmp/kyrae-attach-e2e.XXXXXX)"
NET="kyrae-attach-e2e-net"
PG="kyrae-attach-e2e-pg"
WORKER="kyrae-attach-e2e-worker"
DB_ENV=(-e DB_HOST="$PG" -e DB_PORT=5432 -e DB_NAME=KyraeE2E -e DB_USER=postgres -e DB_PASS=e2e)

cleanup() {
  docker logs "$WORKER" >/dev/null 2>&1 && docker logs "$WORKER" 2>&1 | tail -40 || true
  docker rm -f "$WORKER" "$PG" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  chmod -R u+rwX "$WORK" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

mkdir -p "$WORK/attachments"
chmod 777 "$WORK/attachments"

docker network create "$NET" >/dev/null
docker run -d --name "$PG" --network "$NET" -e POSTGRES_PASSWORD=e2e -e POSTGRES_DB=KyraeE2E postgres:18 >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1; then sleep 2; break; fi
  sleep 1
done
schema_applied() {
  docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U postgres -d KyraeE2E < "$CTX/tests/e2e_schema.sql" >/dev/null 2>&1
}
schema_applied || schema_applied || { docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U postgres -d KyraeE2E < "$CTX/tests/e2e_schema.sql"; }

# Seed runs once; it writes original objects with the same immutable-object discipline.
docker run --rm --name "$WORKER-seed" --network "$NET" \
  -v "$WORK/attachments":/srv/attachments \
  "${DB_ENV[@]}" -e ASSISTANT_ATTACHMENT_STORAGE_ROOT=/srv/attachments \
  "$IMAGE" python /app/tests/e2e_seed.py

# Production coordinator under the same hardening the compose deployment uses.
docker run -d --name "$WORKER" --network "$NET" \
  -v "$WORK/attachments":/srv/attachments \
  --read-only --tmpfs /tmp:size=512m,noexec,nosuid --cap-drop=ALL \
  --security-opt no-new-privileges --pids-limit 64 --memory 2g --cpus 2 \
  "${DB_ENV[@]}" \
  -e ASSISTANT_ATTACHMENT_STORAGE_ROOT=/srv/attachments \
  -e WORKER_POLL_SECONDS=0.5 \
  "$IMAGE" python -m attachment_worker

sleep 3
docker run --rm --network "$NET" \
  -v "$WORK/attachments":/srv/attachments:ro \
  "${DB_ENV[@]}" -e ASSISTANT_ATTACHMENT_STORAGE_ROOT=/srv/attachments \
  "$IMAGE" python /app/tests/e2e_verify.py
