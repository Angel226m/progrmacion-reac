import Config

config :hotelflux,
  ecto_repos: [HotelFlux.Repo],
  generators: [timestamp_type: :utc_datetime],
  env: config_env()

# Endpoint config
config :hotelflux, HotelFluxWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: HotelFluxWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: HotelFlux.PubSub,
  live_view: [signing_salt: "hotelflux_salt"]

# Guardian JWT config
# La secret_key DEBE configurarse via GUARDIAN_SECRET en producción.
# Ver runtime.exs y config/#{config_env()}.exs para valores por entorno.
config :hotelflux, HotelFlux.Guardian,
  issuer: "hotelflux"

# Oban background jobs
config :hotelflux, Oban,
  repo: HotelFlux.Repo,
  queues: [
    default: 10,
    email: 5,
    limpieza: 5
  ]

# JSON library
config :phoenix, :json_library, Jason

# Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

import_config "#{config_env()}.exs"
