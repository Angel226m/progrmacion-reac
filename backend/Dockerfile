# ═══════════════════════════════════════════════════════════
# HotelFlux — Backend Dockerfile (multi-stage, hardened)
# Elixir 1.17 + Erlang/OTP 27
# Seguridad: usuario no-root, HEALTHCHECK, labels OCI
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Build ──
FROM elixir:1.17-otp-27-alpine AS builder

RUN apk add --no-cache build-base git

WORKDIR /app

# Instalar Hex y Rebar
RUN mix local.hex --force && mix local.rebar --force

# Copiar archivos de dependencias primero (excelente para cache)
ENV MIX_ENV=prod
COPY mix.exs mix.lock ./
RUN mix deps.get --only prod
RUN mix deps.compile

# Copiar configuración ANTES de compilar el código de la app
COPY config config

# Copiar el resto del código fuente
COPY lib lib
COPY priv priv

# Compilar (ya tiene acceso a config/prod.exs)
RUN mix compile

# Compilar assets (Tailwind, esbuild, etc.)
RUN mix phx.digest

# Generar el release
RUN mix release

# ── Stage 2: Runtime (hardened) ──
FROM alpine:3.20 AS runtime

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

# Ejecutar migraciones y luego iniciar el servidor
CMD ["sh", "-c", "./bin/hotelflux eval 'HotelFlux.Release.migrate()' && ./bin/hotelflux start"]