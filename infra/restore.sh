#!/usr/bin/env bash
# Restore a backup made by backup.sh into the running stack. Usage: infra/restore.sh backups/oneplate-2026-11-04.sql.gz
set -euo pipefail
f="${1:?backup file}"; cd "$(dirname "$0")"
echo "This replaces the live database with $f. Press Enter to continue or Ctrl-C to abort."; read -r
docker compose stop api
docker compose exec -T db psql -U oneplate -d postgres -c "drop database if exists oneplate_restore; create database oneplate_restore owner oneplate;"
gunzip -c "$f" | docker compose exec -T db psql -U oneplate -d oneplate_restore -q
docker compose exec -T db psql -U oneplate -d postgres -c "alter database oneplate rename to oneplate_old_$(date +%s); alter database oneplate_restore rename to oneplate;"
docker compose start api
echo "restored; the previous database is kept as oneplate_old_* until you drop it"
