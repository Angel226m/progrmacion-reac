#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="${BACKUP_DIR}/hotelflux_${DATE}"
LOG_FILE="${BACKUP_DIR}/backup_log.txt"
COMPRESSION="${BACKUP_COMPRESSION:-gzip}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

: "${POSTGRES_HOST:?POSTGRES_HOST no definido}"
: "${POSTGRES_USER:?POSTGRES_USER no definido}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD no definido}"
: "${POSTGRES_DB:?POSTGRES_DB no definido}"
: "${B2_KEY_ID:?B2_KEY_ID no definido}"
: "${B2_APP_KEY:?B2_APP_KEY no definido}"
: "${B2_BUCKET:?B2_BUCKET no definido}"

mkdir -p "$BACKUP_DIR"

log() {
  local level="${2:-INFO}"
  echo "$(date +"%Y-%m-%d %H:%M:%S") [${level}] $*" | tee -a "$LOG_FILE"
}

cleanup() {
  local exit_code=$?
  log "limpieza" "EXIT" "Exit code: ${exit_code}"
  if [ -f "${BACKUP_FILE}.sql" ]; then
    rm -f "${BACKUP_FILE}.sql"
    log "tmp" "DEBUG" "Archivo temporal eliminado"
  fi
}

trap cleanup EXIT

log "=== INICIO BACKUP ==="

case "$COMPRESSION" in
  gzip)
    EXT=".sql.gz"
    COMPRESS_CMD="gzip -9"
    DECOMPRESS_CMD="zcat"
    ;;
  zstd)
    EXT=".sql.zst"
    COMPRESS_CMD="zstd -19 -T0"
    DECOMPRESS_CMD="zstdcat"
    ;;
  none)
    EXT=".sql"
    COMPRESS_CMD="cat"
    DECOMPRESS_CMD="cat"
    ;;
  *)
    log "Compresion desconocida: ${COMPRESSION}, usando gzip" "WARN"
    EXT=".sql.gz"
    COMPRESS_CMD="gzip -9"
    DECOMPRESS_CMD="zcat"
    ;;
esac

BACKUP_FILE="${BACKUP_FILE}${EXT}"

log "Host: ${POSTGRES_HOST}, DB: ${POSTGRES_DB}" "INFO"
log "Compresion: ${COMPRESSION}" "INFO"

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "$POSTGRES_HOST" \
  -U "$POSTGRES_USER" \
  "$POSTGRES_DB" \
  --create \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --no-comments \
  --verbose \
  2>>"$LOG_FILE" \
| ${COMPRESS_CMD} \
> "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup local: ${BACKUP_FILE} (${SIZE})" "INFO"

if [ ! -s "$BACKUP_FILE" ]; then
  log "ERROR: Backup vacio o no creado" "ERROR"
  exit 1
fi

log "Autenticando B2..." "INFO"
if ! b2 authorize-account "$B2_KEY_ID" "$B2_APP_KEY" 2>>"$LOG_FILE"; then
  log "ERROR: Fallo autenticacion B2" "ERROR"
  exit 1
fi

B2_PATH="backups/hotelflux/$(basename "$BACKUP_FILE")"
if b2 upload-file "$B2_BUCKET" "$BACKUP_FILE" "$B2_PATH" 2>>"$LOG_FILE"; then
  log "Subido a B2: ${B2_BUCKET}/${B2_PATH}" "INFO"
else
  log "ERROR: Fallo subida a B2" "ERROR"
  exit 1
fi

if [ "$RETENTION_DAYS" -gt 0 ]; then
  find "$BACKUP_DIR" \
    -name "hotelflux_*.sql.*" \
    -type f \
    -mtime "+${RETENTION_DAYS}" \
    -delete \
    -print \
    2>>"$LOG_FILE" | while read -r old; do
    log "Purga: ${old}" "INFO"
  done
  log "Backups locales >${RETENTION_DAYS}d purgados" "INFO"
fi

log "=== BACKUP COMPLETADO (${SIZE}) ==="
exit 0
