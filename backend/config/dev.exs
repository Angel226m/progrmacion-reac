import Config

# Dev database
config :hotelflux, HotelFlux.Repo,
  username: "postgres",
  password: "postgres",
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

# Logger dev level
config :logger, :console, format: "[$level] $message\n"

# Dev Oban
config :hotelflux, Oban, testing: :inline

# Set a higher stacktrace during development
config :phoenix, :stacktrace_depth, 20
config :phoenix, :plug_init_mode, :runtime
