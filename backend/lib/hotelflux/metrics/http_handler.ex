defmodule HotelFlux.Metrics.HTTPHandler do
  @moduledoc """
  Maneja eventos de telemetría HTTP y actualiza la tabla ETS
  `:hotelflux_http_metrics` para ser consumida por MetricsController.
  """
  require Logger

  def setup do
    events = [[:phoenix, :endpoint, :stop]]
    :telemetry.attach_many("hotelflux-http-metrics", events, &handle_events/4, :no_config)
  rescue
    _ -> Logger.warning("[HTTPHandler] No se pudo adjuntar a telemetría")
  end

  def handle_events([:phoenix, :endpoint, :stop], _measurements, metadata, _config) do
    duration_us = metadata.duration
    status = metadata.conn.status

    update_ets_counters(status, duration_us)
  rescue
    _ -> :ok
  end

  defp update_ets_counters(status, duration_us) do
    tid = :hotelflux_http_metrics

    :ets.update_counter(tid, :total, 1, {:total, 0})

    if status >= 500 do
      :ets.update_counter(tid, :errors, 1, {:errors, 0})
    end

    update_p95(tid, div(duration_us, 1000))
  end

  defp update_p95(tid, latency_ms) do
    current_p95 = :ets.lookup_element(tid, :p95_ms, 2)
    if latency_ms > current_p95 do
      smoothed = round(current_p95 * 0.95 + latency_ms * 0.05)
      :ets.insert(tid, {:p95_ms, smoothed})
    end
  end
end
