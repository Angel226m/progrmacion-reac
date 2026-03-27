defmodule HotelFlux.Application do
  @moduledoc """
  Aplicación principal de HotelFlux.
  Inicia el árbol de supervisión con todos los servicios reactivos.
  """
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Repositorio Ecto (PostgreSQL)
      HotelFlux.Repo,

      # Telemetría
      HotelFluxWeb.Telemetry,

      # PubSub reactivo — centro neurálgico de la comunicación entre procesos
      {Phoenix.PubSub, name: HotelFlux.PubSub},

      # Redis connection
      {Redix, {Application.get_env(:hotelflux, :redis_url, "redis://localhost:6379"), [name: :redix]}},

      # Oban — jobs en background (emails, retries)
      {Oban, Application.fetch_env!(:hotelflux, Oban)},

      # DNS cluster (si aplica en producción)
      # {DNSCluster, query: "..."},

      # Endpoint HTTP — SIEMPRE al final
      HotelFluxWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: HotelFlux.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    HotelFluxWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
