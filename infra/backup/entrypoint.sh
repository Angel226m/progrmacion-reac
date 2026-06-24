#!/bin/sh
set -e

# Guardar env vars para que cron las herede
printenv | grep -v "no_proxy\|HOME\|PWD\|TERM\|SHLVL\|^_=\|PATH" > /etc/environment

# Configurar cron
mkdir -p /var/spool/cron/crontabs
echo "55 0 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /var/spool/cron/crontabs/root
chmod 0644 /var/spool/cron/crontabs/root

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup scheduler iniciado"
echo "  Horario: 7:55 PM Peru (00:55 UTC) todos los dias"
echo "  Bucket:  $B2_BUCKET"
echo "  Retencion: ${RETENTION_DAYS:-10} dias"

mkdir -p /var/log
touch /var/log/backup.log
tail -f /var/log/backup.log &

exec crond -f -l 2