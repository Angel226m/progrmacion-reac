# syntax=docker/dockerfile:1.7
# ═══════════════════════════════════════════════════════════
# HotelFlux — Frontend Personal Dockerfile (multi-stage, BuildKit)
# Node LTS Alpine (deps + build) → Nginx serve
# Panel de personal/empleados
# OWASP A05+A06: Security headers, Alpine minimal, no-root
# ISO 27001 A.14.2: Desarrollo seguro, mínima superficie
# ═══════════════════════════════════════════════════════════

ARG NODE_VERSION=22
ARG NGINX_VERSION=1.27
ARG ALPINE_VERSION=3.21

# ── Stage 1: Dependencias (capa cacheable) ─────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS deps

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm config set fund false && \
    npm config set audit false

# Solo package files → capa estable
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --prefer-offline --no-audit --no-fund --loglevel=error

# ── Stage 2: Build (Vite production) ───────────────────────
FROM deps AS builder

ARG VITE_API_URL=/api/v1
ARG VITE_WS_URL=/socket

ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    NODE_ENV=production

# Copiar fuentes (excluye node_modules vía .dockerignore)
COPY . .

# node_modules NO se monta como cache: debe quedar en la imagen
# para que tsc/vite estén disponibles al ejecutar npm run build.
RUN npm run build

# ── Stage 3: Runtime (Nginx hardened) ──────────────────────
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine${ALPINE_VERSION} AS runtime

LABEL org.opencontainers.image.title="HotelFlux Frontend Personal" \
      org.opencontainers.image.description="Frontend React/Vite para gestión hotelera" \
      org.opencontainers.image.vendor="HotelFlux" \
      org.opencontainers.image.version="1.0.0"

# Copiar build estático al webroot de nginx
COPY --from=builder /app/dist /usr/share/nginx/html
# Configuración Nginx con SPA fallback, gzip, cache y security headers
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# tini como PID 1 (gestión correcta de señales)
USER root
RUN apk add --no-cache tini curl \
    && rm -f /etc/nginx/conf.d/default.conf.template
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["nginx", "-g", "daemon off;"]
