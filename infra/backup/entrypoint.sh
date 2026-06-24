#!/bin/sh
set -e

# Guardar env vars para que supercronic las herede
printenv | grep -v "no_proxy\|HOME\|PWD\|TERM\|SHLVL\|^_=" > /etc/environment

# Crear crontab
CRON_FILE="/etc/crontab.backup"
echo "55 0 * * * /usr/local/bin/backup.sh" > "$CRON_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup scheduler iniciado"
echo "  Horario: 7:55 PM Peru (00:55 UTC) todos los dias"
echo "  Bucket:  $B2_BUCKET"
echo "  Retencion: ${RETENTION_DAYS:-10} dias"

# supercronic hereda el entorno directamente, no necesita /etc/environment
exec supercronic "$CRON_FILE"