#!/bin/sh
set -e

# Cron no hereda env vars del contenedor: recargar desde /etc/environment
if [ -f /etc/environment ]; then
  . /etc/environment
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="hotelflux_backup_${TIMESTAMP}.sql"
BACKUP_DIR="/tmp/backups"
RETENTION_DAYS=${RETENTION_DAYS:-10}

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup de PostgreSQL..."
echo "  DB: $POSTGRES_DB, User: $POSTGRES_USER"
echo "  Bucket B2: $B2_BUCKET"
echo "  Retention: $RETENTION_DAYS dias"

export PGPASSWORD="$POSTGRES_PASSWORD"

pg_dump \
  -h "$POSTGRES_HOST" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-acl \
  --format=plain \
  --file="$BACKUP_DIR/$FILENAME"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup generado: $BACKUP_DIR/$FILENAME ($(wc -c < "$BACKUP_DIR/$FILENAME") bytes)"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Subiendo a Backblaze B2..."
aws s3 cp "$BACKUP_DIR/$FILENAME" "s3://$B2_BUCKET/db/$FILENAME" \
  --endpoint-url "https://$B2_ENDPOINT"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup subido exitosamente a s3://$B2_BUCKET/db/$FILENAME"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Limpiando backups antiguos (>${RETENTION_DAYS} dias)..."
CUTOFF=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d_%H%M%S)
aws s3api list-objects-v2 \
  --bucket "$B2_BUCKET" \
  --prefix "db/" \
  --endpoint-url "https://$B2_ENDPOINT" \
  --query "Contents[?LastModified<=\`$(date -d "-${RETENTION_DAYS} days" -Iseconds)\`].{Key: Key}" \
  --output json | while read -r line; do
    KEY=$(echo "$line" | grep -o '"db/[^"]*"' | tr -d '"')
    if [ -n "$KEY" ]; then
      echo "  Eliminando antiguo: $KEY"
      aws s3 rm "s3://$B2_BUCKET/$KEY" --endpoint-url "https://$B2_ENDPOINT"
    fi
done

rm -f "$BACKUP_DIR/$FILENAME"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completado exitosamente"
