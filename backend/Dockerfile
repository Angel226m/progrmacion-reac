# syntax=docker/dockerfile:1.7
# ═══════════════════════════════════════════════════════════
# HotelFlux — Backend Dockerfile (multi-stage, hardened, BuildKit)
# Elixir 1.17 + Erlang/OTP 27 → Alpine runtime con ERTS embebido
# Optimizaciones:
#   • BuildKit cache mounts SOLO sobre artefactos re-descargables
#     (hex, mix, deps). NO sobre _build: el contenido de un cache
#     mount no se persiste en el filesystem de la imagen, y por
#     tanto COPY --from=builder no podría leer el release.
#   • _build vive en la imagen de la stage → COPY --from=builder OK
#   • Usuario no-root, tini como PID 1, healthcheck nativo
# OWASP A06:2021 — Alpine minimal, A05 — hardened defaults
# ═══════════════════════════════════════════════════════════

ARG ELIXIR_VERSION=1.17
ARG OTP_VERSION=27
ARG ALPINE_VERSION=3.22

# ── Stage 1: Build (deps + compile + release) ──────────────
FROM elixir:${ELIXIR_VERSION}-otp-${OTP_VERSION}-alpine AS builder

ARG ALPINE_VERSION

RUN apk add --no-cache \
        build-base \
        git \
        ca-certificates \
    && update-ca-certificates --fresh

ENV MIX_ENV=prod \
    ELIXIR_ASSERTIONS_ENABLED=1 \
    LANG=C.UTF-8 \
    HEX_HOME=/root/.hex \
    MIX_HOME=/root/.mix

WORKDIR /app

# Cache de archivos de dependencias
RUN mix local.hex --force && mix local.rebar --force

# 1) Solo dependencias → capa estable mientras mix.lock no cambie.
#    Las dependencias quedan en /app/deps gracias al cache mount.
COPY mix.exs mix.lock ./
RUN --mount=type=cache,target=/root/.hex \
    --mount=type=cache,target=/root/.mix \
    --mount=type=cache,target=/app/deps \
    mix deps.get --only $MIX_ENV && mix deps.compile

# 2) Compilar código de la app
COPY config config
COPY lib lib
COPY priv priv

# _build NO usa cache mount → el contenido queda en la imagen
# y COPY --from=builder puede leerlo más tarde.
RUN --mount=type=cache,target=/root/.hex \
    --mount=type=cache,target=/root/.mix \
    --mount=type=cache,target=/app/deps \
    mix compile

# 3) Digest de assets (priv/static generado por Phoenix)
RUN --mount=type=cache,target=/root/.hex \
    --mount=type=cache,target=/root/.mix \
    --mount=type=cache,target=/app/deps \
    mix phx.digest || true

# 4) Release: artefacto autocontenido en /app/_build/prod/rel/hotelflux
RUN --mount=type=cache,target=/root/.hex \
    --mount=type=cache,target=/root/.mix \
    --mount=type=cache,target=/app/deps \
    mix release

# ── Stage 2: Runtime (mínimo, hardened) ───────────────────
FROM alpine:${ALPINE_VERSION} AS runtime

ARG ALPINE_VERSION

LABEL org.opencontainers.image.title="HotelFlux Backend" \
      org.opencontainers.image.description="Backend Elixir/Phoenix para gestión hotelera" \
      org.opencontainers.image.vendor="HotelFlux" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.source="https://github.com/anomalyco/hotelflux"

# Runtime libs: libstdc++ (para ERTS), openssl, ncurses, curl (healthcheck), tini (PID 1)
RUN apk add --no-cache \
        libstdc++ \
        openssl \
        ncurses-libs \
        ca-certificates \
        curl \
        tini \
    && addgroup -S -g 1000 hotelflux \
    && adduser  -S -u 1000 -G hotelflux -h /app -s /sbin/nologin hotelflux

WORKDIR /app

# Copiar solo el release autocontenido y los seeds/migrations
COPY --from=builder --chown=hotelflux:hotelflux /app/_build/prod/rel/hotelflux ./
COPY --from=builder --chown=hotelflux:hotelflux /app/priv/repo priv/repo

ENV HOME=/app \
    LANG=C.UTF-8 \
    MIX_ENV=prod \
    PORT=4000 \
    REPLACE_OS_VARS=true \
    ERL_AFLAGS="-kernel shell_history enabled" \
    ERL_FLAGS="+JPperf true"

USER hotelflux

EXPOSE 4000

# tini reenvía señales (SIGTERM, SIGINT) para shutdown limpio
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
# Las migraciones se ejecutan en el contenedor init (ver docker-compose).
# El backend solo arranca el release.
CMD ["./bin/hotelflux", "start"]
