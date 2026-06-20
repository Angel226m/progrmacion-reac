# 🔴 Análisis: Error de WebSocket en HotelFlux Production

## El Problema

```
WebSocket connection to 'wss://reactiva-personal.angelproyect.com/socket/websocket' failed:
Could not check origin for Phoenix.Socket transport.
Origin of the request: https://reactiva-personal.angelproyect.com
```

**¿Por qué falla si el origen está en la lista?**

## Root Causes Identificadas

### 1. **Check Origin HARDCODEADO en Compile-Time** ❌

**Código anterior (`endpoint.ex`):**
```elixir
socket "/socket", HotelFluxWeb.UserSocket,
  check_origin: [
    "https://reactiva-personal.angelproyect.com",
    "https://program_react.angelproyect.com"
  ]
```

**Problema:** Phoenix evalúa esta lista en **compile-time** (cuando ejecutas `mix compile`), no en **runtime**. Esto significa:
- Si cambias variables de entorno, Phoenix no lo ve
- Si usas Docker con diferentes entornos, la lista original se "congela"
- Phoenix rechaza aunque el origen esté en la lista porque la validación es muy estricta

**Solución:** Hacer la validación **dinámica en runtime** con un módulo personalizado.

---

### 2. **Nginx NO Reenvía Header Origin** ❌

**Configuración anterior (`nginx.conf`):**
```nginx
location /socket {
    proxy_pass http://hotelflux_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # ❌ FALTA: proxy_set_header Origin $http_origin;
}
```

**Problema:** 
- Nginx recibe `Origin: https://reactiva-personal.angelproyect.com` del navegador
- Pero **NO lo reenvía** al backend
- Phoenix no puede validar el Origin porque no lo recibe
- Resultado: Phoenix asume que el Origin es `http://hotelflux_backend:4000` (interno)
- ❌ Rechazo automático

---

### 3. **CORS Runtime Config No Aplicada al Socket** ❌

**Código anterior (`runtime.exs`):**
```elixir
# Se configura CORS_ORIGINS, pero el socket no lo usa
cors_env = System.get_env("CORS_ORIGINS")
if cors_env do
  config :hotelflux, :cors_origins,
    String.split(cors_env, ",") |> Enum.map(&String.trim/1)
end
```

El socket sigue usando la lista hardcodeada de `endpoint.ex`, ignorando `CORS_ORIGINS`.

---

## Soluciones Implementadas

### ✅ Solución 1: Validador Personalizado de Origen

**Archivo nuevo:** `hotelflux_web/plugs/socket_origin_validator.ex`

```elixir
defmodule HotelFluxWeb.Plugs.SocketOriginValidator do
  def check_origin(origin_header, _endpoint_config, _opts) do
    valid_origins = Application.get_env(:hotelflux, :websocket_check_origins, [])
    
    # Normalizar origen (flexible con protocolos)
    normalized_origin = normalize_origin(origin_header)
    
    Enum.any?(valid_origins, fn allowed ->
      origin_header == allowed || 
        normalize_origin(allowed) == normalized_origin ||
        extract_host(origin_header) == extract_host(allowed)
    end)
  end
  
  defp normalize_origin(origin) do
    origin
    |> String.replace(~r/^https?:\/\//, "")
    |> String.replace(~r/^\/\//, "")
  end
end
```

**Ventajas:**
- Valida en **runtime**, no en compile-time
- Lee `websocket_check_origins` de `runtime.exs` dinámicamente
- Acepta múltiples variantes (con/sin protocolo)
- Registra intentos fallidos para debugging

---

### ✅ Solución 2: Configuración Dinámica en Runtime

**Actualización en `config/runtime.exs`:**

```elixir
websocket_origins = 
  case config_env() do
    :dev ->
      [
        "http://localhost:3001",
        "http://localhost:3003",
        "http://localhost:8080",
        "//localhost:3001",    # Variante sin protocolo
        "//localhost:3003"
      ]
    :prod ->
      cors_env = System.get_env("CORS_ORIGINS")
      cors_env_list = 
        if cors_env do
          String.split(cors_env, ",") |> Enum.map(&String.trim/1)
        else
          [
            "https://program_react.angelproyect.com",
            "https://reactiva-personal.angelproyect.com",
            "//program_react.angelproyect.com",      # Variantes
            "//reactiva-personal.angelproyect.com"
          ]
        end
      cors_env_list
  end

config :hotelflux, :websocket_check_origins, websocket_origins
```

**Ventajas:**
- Lee `CORS_ORIGINS` en **runtime**, no compile-time
- Diferentes listas para dev/prod
- Se puede cambiar sin recompilar

---

### ✅ Solución 3: Nginx Reenvía Origin

**Actualización en `nginx.conf`:**

```nginx
location /socket {
    proxy_pass http://hotelflux_backend;
    proxy_http_version 1.1;
    
    # WebSocket upgrade headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    
    # ✅ NUEVO: Headers críticos que faltaban
    proxy_set_header Origin $http_origin;           # ← CRÍTICO
    proxy_set_header Referer $http_referer;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts extensos para WebSocket (24h)
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
    
    # No cachear
    proxy_buffering off;
    proxy_cache_bypass $http_upgrade;
}
```

**El header crítico es:**
```
proxy_set_header Origin $http_origin;
```

Esto asegura que nginx **reenvíe exactamente el Origin que recibió del navegador**, no uno inventado.

---

## Pasos para Implementar

### 1. Backend — Compilar nuevos cambios
```bash
cd backend
mix compile
```

### 2. Docker Compose — Agregar CORS_ORIGINS

**`docker-compose.yml`** (en el servicio `hotelflux_core_backend`):
```yaml
hotelflux_core_backend:
  image: elixir:1.16-alpine
  environment:
    # ... otras variables ...
    CORS_ORIGINS: "https://reactiva-personal.angelproyect.com,https://program_react.angelproyect.com,http://localhost:3001,http://localhost:3003"
```

### 3. Nginx — Reemplazar `/socket` block

Copiar la configuración mejorada del archivo `WEBSOCKET_NGINX_FIX.md` en cada servidor (reactiva-personal, program_react, etc.)

### 4. Reiniciar servicios
```bash
docker-compose down
docker-compose up -d --build
```

### 5. Verificar

**En el navegador (F12 → Console):**
```javascript
// La conexión debe conectar exitosamente
// Sin mensajes de "WebSocket connection failed"
```

**En los logs del backend:**
```bash
docker logs -f hotelflux_core_backend | grep -i "origin"
```

Debe mostrar:
- ✅ Si es válido: `Origin accepted: https://reactiva-personal.angelproyect.com`
- ❌ Si rechaza: `[WebSocket Origin Rejection] Received Origin: ...`

---

## Diagnóstico Rápido

Si aún falla después de implementar, ejecutar:
```bash
chmod +x diagnose-websocket.sh
./diagnose-websocket.sh
```

---

## Resumen de Cambios

| Componente | Antes | Después |
|-----------|-------|---------|
| **Socket check_origin** | Hardcodeado en código | Dinámico vía módulo validador |
| **Runtime config** | Ignora `websocket_check_origins` | Lee dinámicamente en `runtime.exs` |
| **Nginx Origin header** | ❌ NO reenvía | ✅ Reenvía `$http_origin` |
| **Validación** | Strict, compile-time | Flexible, runtime con logging |

---

## Referencias

- Phoenix WebSocket: https://hexdocs.pm/phoenix/Phoenix.Socket.html
- Nginx proxy_set_header: http://nginx.org/en/docs/http/ngx_http_proxy_module.html
- CORS vs WebSocket: CORS es HTTP, WebSocket valida diferente (check_origin)
