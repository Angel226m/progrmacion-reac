#!/bin/bash
set -euo pipefail

CRON_SCHEDULE="${BACKUP_CRON:-0 19 * * *}"
CRON_FILE="/etc/crontabs/root"
echo "$CRON_SCHEDULE /usr/local/bin/backup.sh" > "$CRON_FILE"

echo "Backup scheduler iniciado con cron: $CRON_SCHEDULE"
crond -f -d 8
