#!/usr/bin/env bash
# Backup restore drill against a local PostgreSQL (no Docker): dumps DATABASE_URL, restores into oneplate_drill, compares row counts.
# Usage: DATABASE_URL=postgres://oneplate:oneplate@localhost:5432/oneplate infra/drill.sh
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL}"
from="$DATABASE_URL"; to="${from%/*}/oneplate_drill"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
pg_dump "$from" | gzip > "$tmp/backup.sql.gz"
psql "${from%/*}/postgres" -qc "drop database if exists oneplate_drill" -c "create database oneplate_drill"
gunzip -c "$tmp/backup.sql.gz" | psql "$to" -q
for t in users households memberships documents audit_events; do
  a=$(psql "$from" -tAc "select count(*) from $t"); b=$(psql "$to" -tAc "select count(*) from $t")
  printf "%-14s source %6s  restored %6s  %s\n" "$t" "$a" "$b" "$([ "$a" = "$b" ] && echo ok || echo MISMATCH)"
  [ "$a" = "$b" ] || exit 1
done
psql "${from%/*}/postgres" -qc "drop database oneplate_drill"
echo "drill passed: $(du -h "$tmp/backup.sql.gz" | cut -f1) backup restored and verified"
