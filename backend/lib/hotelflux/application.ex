defmodule HotelFlux.Application do
  @moduledoc """
  Aplicación principal de HotelFlux.
  Inicia el árbol de supervisión con todos los servicios reactivos.
  """
  use Application

  @impl true
  def start(_type, _args) do
    ensure_http_metrics_table!()

    children = [
      # Repositorio Ecto (PostgreSQL)
      HotelFlux.Repo,

      # Telemetría
      HotelFluxWeb.Telemetry,

      # PubSub reactivo — centro neurálgico de la comunicación entre procesos
      {Phoenix.PubSub, name: HotelFlux.PubSub},

      # Redis connection
      {Redix, {Application.get_env(:hotelflux, :redis_url, "redis://localhost:6379"), [name: :redix]}},

      # Finch HTTP client (para Resend API)
      {Finch, name: HotelFlux.Finch},

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

  defp ensure_http_metrics_table! do
    case :ets.whereis(:hotelflux_http_metrics) do
      :undefined ->
        :ets.new(:hotelflux_http_metrics, [
          :named_table,
          :public,
          :set,
          write_concurrency: true,
          read_concurrency: true
        ])
        :ets.insert(:hotelflux_http_metrics, [
          {:total, 0},
          {:errors, 0},
          {:p95_ms, 0}
        ])
      _ ->
        :ok
    end

    HotelFlux.Metrics.HTTPHandler.setup()
  end

  @impl true
  def config_change(changed, _new, removed) do
    HotelFluxWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
