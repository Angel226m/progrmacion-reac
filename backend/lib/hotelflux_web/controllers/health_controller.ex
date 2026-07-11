defmodule HotelFluxWeb.HealthController do
  @moduledoc """
  Health checks para monitoreo — OWASP A05 (Security Misconfiguration):
  El endpoint /health/detailed se limita a la red interna vía nginx.
  No expone información sensible de configuración ni stack traces.
  """
  use Phoenix.Controller
  alias HotelFlux.Repo

  # ── Liveness probe simple (para Docker / Kubernetes) ──
  def check(conn, _params) do
    conn |> json(%{status: "ok", app: "HotelFlux", version: "1.0.0"})
  end

  # ── Readiness probe detallado (para dashboard interno) ──
  def detailed(conn, _params) do
    {db_status, db_ms}    = check_database()
    {redis_status, redis_ms} = check_redis()

    overall = overall_status(db_status, redis_status)

    uptime_ms = :erlang.statistics(:wall_clock) |> elem(0)

    conn
    |> put_resp_header("cache-control", "no-store")
    |> json(%{
      status:          overall,
      app:             "HotelFlux",
      version:         "1.0.0",
      timestamp:       DateTime.utc_now() |> DateTime.to_iso8601(),
      uptime_seconds:  div(uptime_ms, 1000),
      services: %{
        backend:  %{status: "ok",       latency_ms: 0},
        database: %{status: db_status,  latency_ms: db_ms},
        redis:    %{status: redis_status, latency_ms: redis_ms}
      }
    })
  end

  # ── Helpers privados ──

  defp overall_status("error", _redis), do: "degraded"
  defp overall_status(_db, "error"), do: "degraded"
  defp overall_status(_db, _redis), do: "ok"

  defp check_database do
    t = System.monotonic_time(:millisecond)

    case Repo.query("SELECT 1") do
      {:ok, _} -> {"ok", System.monotonic_time(:millisecond) - t}
      {:error, _} -> {"error", -1}
    end
  end

  defp check_redis do
    t = System.monotonic_time(:millisecond)

    case Redix.command(:redix, ["PING"]) do
      {:ok, "PONG"} -> {"ok", System.monotonic_time(:millisecond) - t}
      _             -> {"error", -1}
    end
  end
end
