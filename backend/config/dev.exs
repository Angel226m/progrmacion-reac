import Config

# Dev database (usa las credenciales de Docker)
config :hotelflux, HotelFlux.Repo,
  username: "hotelflux",
  password: "hotelflux_dev_2026",
  hostname: "localhost",
  database: "hotelflux_dev",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

# Dev endpoint
config :hotelflux, HotelFluxWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4000],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "dev_secret_key_base_at_least_64_bytes_long_for_development_purposes_only_1234567890",
  watchers: []

# Redis dev
config :hotelflux, :redis_url, "redis://localhost:6379"

# Guardian dev secret
config :hotelflux, HotelFlux.Guardian,
  secret_key: "dev_secret_key_64_chars_long_for_development_purposes_only_1234567890abcdef"

# Resend API key (dev — usar variable de entorno o dejar simulado)
config :hotelflux, :resend_api_key, System.get_env("RESEND_API_KEY", "re_test")

# Frontend URL dev
config :hotelflux, :frontend_url, "http://localhost:3001"

# Logger dev level
config :logger, :console, format: "[$level] $message\n"

# Dev Oban
config :hotelflux, Oban, testing: :inline

# Set a higher stacktrace during development
config :phoenix, :stacktrace_depth, 20
config :phoenix, :plug_init_mode, :runtime
