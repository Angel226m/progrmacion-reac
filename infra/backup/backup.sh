#!/bin/bash
set -euo pipefail

DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/hotelflux_$DATE.sql.gz"
LOG_FILE="$BACKUP_DIR/backup_log.txt"

REQUIRED_VARS=(POSTGRES_HOST POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB B2_KEY_ID B2_APP_KEY B2_BUCKET)
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: $var no esta definida en el entorno"
    exit 1
  fi
done

mkdir -p "$BACKUP_DIR"

log() {
  echo "$(date +"%Y-%m-%d %H:%M:%S"): $*" | tee -a "$LOG_FILE"
}

log "=== Iniciando backup ==="

pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" > /dev/null 2>&1 || {
  log "ERROR: PostgreSQL no responde en $POSTGRES_HOST"
  exit 1
}

pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" "$POSTGRES_DB" \
  --create --clean --if-exists --no-owner \
  --compress=9 \
  --format=custom \
  -f "$BACKUP_DIR/hotelflux_$DATE.dump"

SIZE=$(du -h "$BACKUP_DIR/hotelflux_$DATE.dump" | cut -f1)
log "Backup creado: $BACKUP_DIR/hotelflux_$DATE.dump ($SIZE)"

b2 authorize-account "$B2_KEY_ID" "$B2_APP_KEY" > /dev/null 2>&1
B2_PATH="backups/hotelflux_$DATE.dump"
b2 upload-file "$B2_BUCKET" "$BACKUP_DIR/hotelflux_$DATE.dump" "$B2_PATH" > /dev/null 2>&1
log "Subido a B2: $B2_PATH"

find "$BACKUP_DIR" -name "hotelflux_*.dump" -type f -mtime +7 -delete
find "$BACKUP_DIR" -name "hotelflux_*.sql.gz" -type f -mtime +7 -delete
log "Backups locales antiguos eliminados"

log "=== Backup completado ==="
