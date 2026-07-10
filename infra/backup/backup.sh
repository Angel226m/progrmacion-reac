#!/bin/bash
set -euo pipefail

DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/hotelflux_$DATE.sql.gz"
LOG_FILE="$BACKUP_DIR/backup_log.txt"

mkdir -p "$BACKUP_DIR"

log() {
  echo "$(date +"%Y-%m-%d %H:%M:%S"): $*" | tee -a "$LOG_FILE"
}

log "=== Iniciando backup ==="

pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" "$POSTGRES_DB" \
  --create --clean --if-exists --no-owner | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup creado: $BACKUP_FILE ($SIZE)"

b2 authorize-account "$B2_KEY_ID" "$B2_APP_KEY"
B2_PATH="backups/$(basename "$BACKUP_FILE")"
b2 upload-file "$B2_BUCKET" "$BACKUP_FILE" "$B2_PATH"
log "Subido a B2: $B2_PATH"

find "$BACKUP_DIR" -name "hotelflux_*.sql.gz" -type f -mtime +7 -delete
log "Backups locales antiguos eliminados"

log "=== Backup completado ==="
