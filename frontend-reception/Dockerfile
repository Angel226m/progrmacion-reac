# ═══════════════════════════════════════════════════════════
# HotelFlux — Frontend Dockerfile (multi-stage, hardened)
# Node 23 + Vite build → Nginx serve
# Seguridad: usuario nginx no-root, headers, HEALTHCHECK
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Build ──
FROM node:23-alpine AS builder

LABEL org.opencontainers.image.title="HotelFlux Frontend" \
      org.opencontainers.image.description="Frontend React/Vite para gestión hotelera"

WORKDIR /app

RUN npm config set cache /tmp/.npm-cache --global

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund --loglevel=error

COPY . .
RUN npm run build

# ── Stage 2: Serve (hardened Nginx) ──
FROM nginx:1.27-alpine AS runtime

# Instalar curl para healthcheck
RUN apk add --no-cache curl

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
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]