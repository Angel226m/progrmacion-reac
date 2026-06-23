# Configuración de nginx mejorada para WebSocket — solución del error de origen

## Agregar esto a la sección del servidor reactiva-personal.angelproyect.com

# IMPORTANTE: Reemplazar la sección /socket existente con esto:

location /socket {
    # ── Validación y reenvío de headers ──
    proxy_pass http://hotelflux_backend;
    proxy_http_version 1.1;
    
    # ── Headers de upgrade para WebSocket ──
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    
    # ── Headers esenciales que faltaban ──
    proxy_set_header Host $host;
    proxy_set_header Origin $http_origin;           # ✅ REENVIAR Origin original
    proxy_set_header Referer $http_referer;         # Para CSRF checks
    
    # ── X-Forwarded headers para Phoenix ──
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;     # HTTPS desde cliente
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    
    # ── Timeouts extensos para WebSocket (24h máximo) ──
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
    proxy_connect_timeout 60s;
    
    # ── Buffering deshabilitado para streaming en tiempo real ──
    proxy_buffering off;
    proxy_request_buffering off;
    
    # ── Cache deshabilitado ──
    proxy_cache_bypass $http_upgrade;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}

# ═══════════════════════════════════════════════════════════════
# NOTAS DE IMPLEMENTACIÓN
# ═══════════════════════════════════════════════════════════════

# 1. El header "Origin" es crítico:
#    - Phoenix valida Origin contra check_origin
#    - nginx DEBE reenviar $http_origin, no fabricar uno
#
# 2. Variables nginx importantes:
#    $http_origin     → El Origin header del cliente (EXACTO)
#    $http_referer    → Referer para CSRF checks
#    $scheme          → http o https (visto por cliente)
#    $host            → Host header original
#
# 3. Este header mapa es REQUERIDO para que el error desaparezca:
#    proxy_set_header Origin $http_origin;
#
# 4. Si aún falla después, verificar en Docker:
#    docker logs -f hotelflux_core_backend | grep -i origin
#    Debe mostrar: "Origin of the request: https://reactiva-personal..."
#
# 5. Variables de entorno requeridas en el backend:
#    CORS_ORIGINS="https://reactiva-personal.angelproyect.com,https://program-react.angelproyect.com"
