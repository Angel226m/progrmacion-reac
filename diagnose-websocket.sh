#!/bin/bash
# Diagnóstico de error de WebSocket — HotelFlux

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ DIAGNÓSTICO: WebSocket Origin Validation Error                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"

CONTAINER_NAME="hotelflux_core_backend"

echo ""
echo "[1/4] Verificando si el contenedor está corriendo..."
if docker ps | grep -q $CONTAINER_NAME; then
    echo "✅ Contenedor $CONTAINER_NAME está ACTIVO"
else
    echo "❌ Contenedor $CONTAINER_NAME NO está corriendo"
    exit 1
fi

echo ""
echo "[2/4] Verificando variables de entorno CORS..."
CORS_ORIGINS=$(docker exec $CONTAINER_NAME printenv CORS_ORIGINS 2>/dev/null)
if [ -z "$CORS_ORIGINS" ]; then
    echo "⚠️  CORS_ORIGINS no está definida"
    echo "   Definir en docker-compose.yml:"
    echo "   environment:"
    echo '     - CORS_ORIGINS="https://reactiva-personal.angelproyect.com,https://program-react.angelproyect.com"'
else
    echo "✅ CORS_ORIGINS = $CORS_ORIGINS"
fi

echo ""
echo "[3/4] Últimos 20 logs de error de origen..."
docker logs --tail 50 $CONTAINER_NAME 2>/dev/null | grep -i "origin" | tail -20

echo ""
echo "[4/4] Verificando nginx forwarding headers..."
echo "---"
echo "Ejecutar en el contenedor hotelflux_core_backend:"
echo "  mix run -e 'IO.inspect(Application.get_env(:hotelflux, :websocket_check_origins))'"
echo ""
docker exec $CONTAINER_NAME elixir -e "IO.inspect(Application.get_env(:hotelflux, :websocket_check_origins))" 2>/dev/null

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ SOLUCIONES:                                                     ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║ 1. Actualizar nginx con header Origin (ver WEBSOCKET_NGINX_FIX.md)"
echo "║ 2. Definir CORS_ORIGINS en docker-compose.yml"
echo "║ 3. Rebuild del contenedor: docker-compose up -d --build"
echo "║ 4. Test: Browser → F12 → Console → ver error en verde"
echo "╚════════════════════════════════════════════════════════════════╝"
