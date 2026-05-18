# ═══════════════════════════════════════════════════════════
# HotelFlux — Frontend Cliente Dockerfile (3-stage, hardened)
# Node LTS (deps) → Vite build → Nginx serve
# Portal público: landing + reservas + cuenta de huésped
# OWASP A05+A06: Security headers, Alpine minimal
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Dependencies (cached layer) ──
FROM node:lts-alpine AS deps

LABEL org.opencontainers.image.title="HotelFlux Frontend Cliente" \
      org.opencontainers.image.description="Portal de clientes y huéspedes React/Vite"

WORKDIR /app

RUN npm config set cache /tmp/.npm-cache --global

# Solo package files → esta capa se cachea si deps no cambian
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund --loglevel=error

# ── Stage 2: Build ──
FROM deps AS builder

# Build args para variables de entorno de Vite
ARG VITE_API_URL=/api/v1
ARG VITE_WS_URL=ws://localhost/socket

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY . .
RUN npm run build

# ── Stage 3: Serve (hardened Nginx) ──
FROM nginx:1.27-alpine AS runtime

# wget already available in nginx:alpine; no extra packages needed

# Copiar build
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración Nginx con SPA fallback, gzip, cache y security headers
RUN cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Seguridad headers (OWASP)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache estático agresivo (Vite genera hashes en filenames)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Gzip en el servidor interno
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Proxy → backend (API y WebSocket)
    location /api/ {
        proxy_pass http://backend:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket {
        proxy_pass http://backend:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health endpoint
    location /health {
        access_log off;
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
NGINX

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]