FROM alpine:3.21
RUN apk add --no-cache bash postgresql16-client curl tini
RUN curl -sL https://github.com/Backblaze/B2_Command_Line_Tool/releases/latest/download/b2-linux -o /usr/local/bin/b2 && \
    chmod +x /usr/local/bin/b2
COPY backup.sh /usr/local/bin/backup.sh
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /usr/local/bin/backup.sh /entrypoint.sh
VOLUME ["/backups"]
HEALTHCHECK --interval=1h --timeout=10s --start-period=30s --retries=3 \
  CMD pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" || exit 1
ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
LABEL com.hotelflux.service="db-backup" \
      com.hotelflux.environment="production" \
      com.hotelflux.component="backup"
