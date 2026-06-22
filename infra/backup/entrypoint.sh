#!/bin/sh
set -e

printenv | grep -v "no_proxy\|HOME\|PWD\|TERM\|SHLVL\|_\|PATH" > /etc/environment

echo "# Backup diario a las 4:00 PM hora Peru (UTC-5 = 21:00 UTC)" > /var/spool/cron/crontabs/root
echo "0 21 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" >> /var/spool/cron/crontabs/root
chmod 0644 /var/spool/cron/crontabs/root

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup scheduler iniciado"
echo "  Horario: 4:00 PM Peru (21:00 UTC) todos los dias"
echo "  Bucket:  $B2_BUCKET"
echo "  Retencion: ${RETENTION_DAYS:-10} dias"

mkdir -p /var/log
touch /var/log/backup.log
tail -f /var/log/backup.log &

crond -f -l 2
