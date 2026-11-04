#!/usr/bin/env bash
# Nightly dump of the OnePlate database. Add to cron: 0 3 * * * /path/to/infra/backup.sh
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p backups
docker compose exec -T db pg_dump -U oneplate oneplate | gzip > "backups/oneplate-$(date +%F).sql.gz"
find backups -name '*.sql.gz' -mtime +30 -delete
echo "backup written"
