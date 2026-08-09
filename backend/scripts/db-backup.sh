#!/bin/bash
# Nightly Postgres backup for AXEL (contract deliverable 10: 本番稼働時点の
# バックアップ + 復元手順). Keeps the last 14 daily dumps, gzipped.
#
# Restore:  gunzip -c <file>.sql.gz | psql "<DATABASE_URL without ?schema>"
#
# Cron (2:30 JST nightly), add with `crontab -e`:
#   30 2 * * * /home/dev/Documents/project_ex/AI_vita/backend/scripts/db-backup.sh >> /home/dev/axel-backups/backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${AXEL_BACKUP_DIR:-/home/dev/axel-backups}"
KEEP=14
ENV_FILE="/home/dev/Documents/project_ex/AI_vita/backend/.env"

mkdir -p "$BACKUP_DIR"

# Read DATABASE_URL and strip Prisma's ?schema= query param (libpq rejects it)
RAW_URL=$(grep -oP '(?<=^DATABASE_URL=).*' "$ENV_FILE" | tr -d '"'"'"'')
PG_URL="${RAW_URL%%\?*}"

STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/axel-db-$STAMP.sql.gz"

pg_dump "$PG_URL" --no-owner --no-privileges | gzip > "$OUT"
SIZE=$(du -h "$OUT" | cut -f1)
echo "[db-backup] $(date '+%F %T') wrote $OUT ($SIZE)"

# Prune old dumps beyond KEEP
ls -1t "$BACKUP_DIR"/axel-db-*.sql.gz 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
echo "[db-backup] retained latest $KEEP dumps in $BACKUP_DIR"
