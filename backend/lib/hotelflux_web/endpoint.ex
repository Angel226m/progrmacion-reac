defmodule HotelFluxWeb.Endpoint do
  @moduledoc """
  Endpoint principal de HotelFlux — Pipeline de seguridad OWASP completo.

  Orden de plugs (defensa en profundidad — ISO 27001 A.14.1):
    1. RequestId → trazabilidad única por petición
    2. Telemetry → métricas de rendimiento (Prometheus)
    3. SecurityHeaders → OWASP headers en cada respuesta
    4. AuditLog → registro de auditoría ISO 27001
    5. Parsers → parsing seguro con límite de body (8MB)
    6. CORS → orígenes permitidos explícitos
    7. InputSanitization → prevención de inyección XSS/SQLi
    8. Router → enrutamiento con pipelines de auth/roles
  """
  use Phoenix.Endpoint, otp_app: :hotelflux

  # WebSocket reactivo — conexión persistente para canales de tiempo real
  # check_origin se configura en runtime.exs vía CHECK_ORIGINS env var
  socket "/socket", HotelFluxWeb.UserSocket,
    websocket: [
      connect_info: [:x_headers, :uri, :peer_data],
      timeout: 45_000,
      compress: true
    ],
    longpoll: false

  # Serve liveDashboard en desarrollo
  if Application.compile_env(:hotelflux, :env) == :dev do
    plug Phoenix.CodeReloader
  end

  # ── 1. Trazabilidad (ISO 27001 A.12.4.1) ──
  plug Plug.RequestId

  # ── 2. Telemetría (métricas Prometheus) ──
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  # ── 3. Headers de seguridad OWASP (A05:2021) ──
  plug HotelFluxWeb.Plugs.SecurityHeadersPlug

  # ── 4. Auditoría ISO 27001 (A.12.4) ──
  plug HotelFluxWeb.Plugs.AuditLogPlug

  # ── 5. Parsing seguro con límite de body (previene DoS — OWASP A04) ──
  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library(),
    length: 8_000_000

  plug Plug.MethodOverride
  plug Plug.Head

  # ── 6. CORS con orígenes explícitos (OWASP A01:2021) ──
  cors_origins = Application.compile_env(:hotelflux, :cors_origins, [
    "http://localhost:3001",                    # frontend-cliente (dev)
    "http://localhost:3003",                    # frontend-personal (dev)
    "http://localhost",                         # frontend-personal (prod vía nginx)
    "http://localhost:8080",                    # frontend-cliente (prod vía nginx)
    "https://reactiva-cliente.angelproyect.com",     # frontend-cliente (producción)
    "https://reactiva-personal.angelproyect.com", # frontend-personal (producción)
  ])

  plug CORSPlug,
    origin: cors_origins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    headers: ["Authorization", "Content-Type", "Accept", "X-Request-Id"],
    max_age: 3600

  # ── 7. Sanitización de entrada (OWASP A03:2021) ──
  plug HotelFluxWeb.Plugs.InputSanitizationPlug

  # ── 8. Router principal ──
  plug HotelFluxWeb.Router
end
