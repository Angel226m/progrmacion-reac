FROM alpine:3.21

RUN apk add --no-cache \
  bash \
  postgresql-client \
  curl \
  s6-overlay \
  tzdata \
  gzip \
  zstd

RUN curl -fsSL \
  https://github.com/Backblaze/B2_Command_Line_Tool/releases/latest/download/b2-linux \
  -o /usr/local/bin/b2 && \
  chmod +x /usr/local/bin/b2 && \
  b2 version

COPY backup.sh /usr/local/bin/backup.sh
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /usr/local/bin/backup.sh /entrypoint.sh && \
  mkdir -p /backups && \
  adduser -D -H -s /sbin/nologin backup && \
  chown -R backup:backup /backups /usr/local/bin/backup.sh /entrypoint.sh

VOLUME ["/backups"]

USER backup

ENTRYPOINT ["/entrypoint.sh"]
