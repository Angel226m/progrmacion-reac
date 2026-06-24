FROM postgres:18-alpine

RUN apk add --no-cache aws-cli bash curl

ARG SUPERCRONIC_VERSION=v0.2.33
RUN ARCH=$(uname -m) && \
    case "$ARCH" in \
      x86_64)  SC_ARCH="linux-amd64" ;; \
      aarch64) SC_ARCH="linux-arm64" ;; \
      armv7l)  SC_ARCH="linux-arm" ;; \
      *) echo "Arquitectura no soportada: $ARCH" && exit 1 ;; \
    esac && \
    curl -fsSLo /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-${SC_ARCH}" && \
    chmod +x /usr/local/bin/supercronic

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]