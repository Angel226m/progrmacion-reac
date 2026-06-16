import Config

# Production configuration — reads from environment variables
config :hotelflux, HotelFlux.Repo,
  url: System.get_env("DATABASE_URL"),
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
  ssl: System.get_env("DATABASE_SSL", "false") == "true"

config :hotelflux, HotelFluxWeb.Endpoint,
  url: [host: System.get_env("PHX_HOST") || "localhost", port: 443, scheme: "https"],
  http: [
    ip: {0, 0, 0, 0},
    port: String.to_integer(System.get_env("PORT") || "4000")
  ],
  secret_key_base: System.get_env("SECRET_KEY_BASE"),
  server: true,
  # Cookie segura para session (HTTP-only, Secure, SameSite)
  session_options: [
    store: :cookie,
    key: "_hotelflux_session",
    signing_salt: System.get_env("SESSION_SIGNING_SALT") || "hotelflux_session_salt",
    same_site: "Strict",
    secure: true,
    http_only: true,
    max_age: 86_400  # 24 horas
  ]

config :hotelflux, :redis_url, System.get_env("REDIS_URL") || "redis://redis:6379"

# Solo validar en producción; dev/test tienen secretos en config/env
if config_env() == :prod do
  guardian_secret = System.get_env("GUARDIAN_SECRET")
  if is_nil(guardian_secret) do
    raise "Falta la variable de entorno GUARDIAN_SECRET en producción. " <>
          "Genere una con: mix phx.gen.secret"
  end

  config :hotelflux, HotelFlux.Guardian,
    secret_key: guardian_secret,
    # Token expiration: 24h access token
    ttl: {24, :hours},
    token_ttl: %{
      "access" => {24, :hours},
      "refresh" => {7, :days}
    }
end

# CORS orígenes desde variable de entorno (separados por coma)
cors_env = System.get_env("CORS_ORIGINS")
if cors_env do
  config :hotelflux, :cors_origins,
    String.split(cors_env, ",") |> Enum.map(&String.trim/1)
end

config :logger, level: :info
