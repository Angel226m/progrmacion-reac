#!/bin/sh
set -e

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup scheduler iniciado"
echo "  Horario: 7:55 PM Peru (00:55 UTC) todos los dias"
echo "  Bucket:  $B2_BUCKET"
echo "  Retencion: ${RETENTION_DAYS:-10} dias"

# Verificar que el script existe y es ejecutable
ls -la /usr/local/bin/backup.sh

# Crear crontab con ruta absoluta explícita
CRON_FILE="/etc/crontab.backup"
echo "55 0 * * * /bin/sh /usr/local/bin/backup.sh" > "$CRON_FILE"

echo "  Crontab:"
cat "$CRON_FILE"

exec /usr/local/bin/supercronic "$CRON_FILE"