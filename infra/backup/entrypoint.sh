#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

LOG_FILE="${BACKUP_DIR:-/backups}/backup_log.txt"
mkdir -p "${BACKUP_DIR:-/backups}"

log() {
  echo "$(date +"%Y-%m-%d %H:%M:%S") [ENTRYPOINT] $*" | tee -a "$LOG_FILE"
}

validate_env() {
  local missing=0
  for var in POSTGRES_HOST POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB \
             B2_KEY_ID B2_APP_KEY B2_BUCKET; do
    if [ -z "${!var:-}" ]; then
      log "ERROR: ${var} no definido"
      missing=1
    fi
  done
  return $missing
}

log "Validando entorno..."
if ! validate_env; then
  log "FATAL: Variables de entorno faltantes"
  exit 1
fi
log "Entorno validado correctamente"

log "Ejecutando backup inicial..."
if /usr/local/bin/backup.sh; then
  log "Backup inicial completado"
else
  log "WARN: Backup inicial fallo, se reintentara segun cron" "WARN"
fi

SCHEDULE="${BACKUP_CRON_SCHEDULE:-0 0 * * *}"
log "Programando cron: ${SCHEDULE}"
log "Logs: ${LOG_FILE}"

echo "${SCHEDULE} /usr/local/bin/backup.sh >> ${LOG_FILE} 2>&1" | crontab -

log "Entrypoint iniciado. Esperando cron..."
exec crond -f -d 6
