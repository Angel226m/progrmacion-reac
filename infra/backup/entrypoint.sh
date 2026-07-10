#!/bin/bash
set -euo pipefail

CRON_FILE="/etc/crontabs/root"
echo "0 19 * * * /usr/local/bin/backup.sh" > "$CRON_FILE"

crond -f -d 8
