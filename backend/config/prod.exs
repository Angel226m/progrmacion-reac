import Config

# ═══════════════════════════════════════════════════════════════
# Configuración de PRODUCCIÓN — HotelFlux
# Los valores sensibles se leen de variables de entorno en runtime.exs
# ═══════════════════════════════════════════════════════════════

# Endpoint de producción — servidor habilitado
config :hotelflux, HotelFluxWeb.Endpoint,
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true

# Nivel de log en producción
config :logger, level: :info

# Bcrypt rounds altos en producción (seguridad OWASP)
config :bcrypt_elixir, log_rounds: 12

# No incluir metadatos de debug en producción
config :phoenix, :stacktrace_depth, 5
