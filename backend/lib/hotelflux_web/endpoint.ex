defmodule HotelFluxWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :hotelflux

  # WebSocket reactivo — conexión persistente para canales de tiempo real
  socket "/socket", HotelFluxWeb.UserSocket,
    websocket: [timeout: 45_000],
    longpoll: false

  # Serve liveDashboard en desarrollo
  if code_reloading? do
    plug Phoenix.CodeReloader
  end

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug CORSPlug, origin: ["http://localhost:3000", "http://localhost:3001"]
  plug HotelFluxWeb.Router
end
