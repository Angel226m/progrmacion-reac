import Config

# Test database — pool mode for concurrent tests
config :hotelflux, HotelFlux.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "hotelflux_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# Test endpoint
config :hotelflux, HotelFluxWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "test_secret_key_base_at_least_64_bytes_long_for_testing_purposes_only_1234567890ab",
  server: false

# Redis test
config :hotelflux, :redis_url, "redis://localhost:6379/1"

# Oban test mode
config :hotelflux, Oban, testing: :inline

# Log only warnings and above in test
config :logger, level: :warning

# Bcrypt faster in test
config :bcrypt_elixir, log_rounds: 1

# Initialize plugs at runtime for faster compilation
config :phoenix, :plug_init_mode, :runtime
