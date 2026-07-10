FROM alpine:3.19

RUN apk add --no-cache bash postgresql-client curl

RUN curl -sL https://github.com/Backblaze/B2_Command_Line_Tool/releases/latest/download/b2-linux -o /usr/local/bin/b2 && \
    chmod +x /usr/local/bin/b2

COPY backup.sh /usr/local/bin/backup.sh
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /usr/local/bin/backup.sh /entrypoint.sh

VOLUME ["/backups"]
ENTRYPOINT ["/entrypoint.sh"]
