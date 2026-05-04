# ═══════════════════════════════════════════════════════════
# HotelFlux — Backend Dockerfile (multi-stage, hardened)
# Elixir 1.17 + Erlang/OTP 27
# Optimizado: capas de cache, usuario no-root, HEALTHCHECK
# OWASP A06:2021 — Vulnerable Components: Alpine minimal
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Dependencies (cached layer) ──
FROM elixir:1.17-otp-27-alpine AS deps

RUN apk add --no-cache build-base git

WORKDIR /app

RUN mix local.hex --force && mix local.rebar --force

ENV MIX_ENV=prod

# Solo archivos de dependencias → esta capa se cachea si mix.exs/lock no cambian
COPY mix.exs mix.lock ./
RUN mix deps.get --only prod

# ── Stage 2: Build (compilar código) ──
FROM deps AS builder

# Compilar dependencias (capa separada del código de la app)
RUN mix deps.compile

# Copiar configuración
COPY config config

# Copiar código fuente
COPY lib lib
COPY priv priv

# Compilar la aplicación
RUN mix compile

# Assets: Tailwind, esbuild, digest
RUN mix phx.digest

# Generar el release optimizado
RUN mix release

# ── Stage 2: Runtime (hardened) ──
FROM alpine:3.22 AS runtime

LABEL org.opencontainers.image.title="HotelFlux Backend" \
      org.opencontainers.image.description="Backend Elixir/Phoenix para gestión hotelera" \
      org.opencontainers.image.vendor="HotelFlux" \
      org.opencontainers.image.version="1.0.0"

RUN apk add --no-cache libstdc++ openssl ncurses-libs curl \
    && addgroup -S hotelflux \
    && adduser -S -G hotelflux -h /app -s /sbin/nologin hotelflux

WORKDIR /app

# Copiar el release generado
COPY --from=builder --chown=hotelflux:hotelflux /app/_build/prod/rel/hotelflux ./

# Copiar migraciones y seeds
COPY --from=builder --chown=hotelflux:hotelflux /app/priv/repo priv/repo

# Usar usuario no-root (OWASP)
USER hotelflux

ENV HOME=/app
ENV MIX_ENV=prod
ENV PORT=4000
ENV ERL_FLAGS="+JPperf true"

EXPOSE 4000

# Health check nativo de Docker
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Ejecutar migraciones, seeds y luego iniciar el servidor
CMD ["sh", "-c", "./bin/hotelflux eval 'HotelFlux.Release.migrate()' && ./bin/hotelflux eval 'HotelFlux.Release.seed()' && ./bin/hotelflux start"]