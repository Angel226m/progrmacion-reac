defmodule HotelFluxWeb.Plugs.AuditLogPlug do
  @moduledoc """
  Plug de auditoría — Registra acciones sensibles para cumplimiento ISO 27001.

  Implementa controles:
    - ISO 27001 A.12.4 (Logging and Monitoring)
    - ISO 27001 A.9.4 (System Access Control)
    - OWASP A09:2021 (Security Logging and Monitoring Failures)

  Registra:
    - Método HTTP + ruta + IP + timestamp
    - Usuario autenticado (si aplica)
    - Tiempo de respuesta
    - Código de estado HTTP
  """
  import Plug.Conn

  require Logger

  @behaviour Plug

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    inicio = System.monotonic_time(:microsecond)

    register_before_send(conn, fn conn ->
      duracion_ms = (System.monotonic_time(:microsecond) - inicio) / 1_000

      ip = conn.remote_ip |> :inet.ntoa() |> to_string()
      metodo = conn.method
      ruta = conn.request_path
      status = conn.status
      usuario_id = get_usuario_id(conn)

      # Log estructurado para análisis (Loki/ELK compatible)
      Logger.info(
        "[Audit] #{metodo} #{ruta} → #{status} | " <>
        "IP=#{ip} | Usuario=#{usuario_id || "anon"} | " <>
        "Duración=#{Float.round(duracion_ms, 2)}ms",
        audit: true,
        method: metodo,
        path: ruta,
        status: status,
        ip: ip,
        user_id: usuario_id,
        duration_ms: Float.round(duracion_ms, 2)
      )

      # Alertar si la respuesta es lenta (>2s) — ISO 27001 A.12.1
      if duracion_ms > 2_000 do
        Logger.warning(
          "[Audit] Respuesta lenta detectada: #{metodo} #{ruta} tomó #{Float.round(duracion_ms, 2)}ms",
          slow_response: true
        )
      end

      # Alertar accesos no autorizados — ISO 27001 A.9.4
      if status in [401, 403] do
        Logger.warning(
          "[Audit] Acceso denegado: #{metodo} #{ruta} desde IP=#{ip} (#{status})",
          access_denied: true
        )
      end

      conn
    end)
  end

  defp get_usuario_id(conn) do
    case conn.assigns[:current_user] do
      %{id: id} -> id
      _ ->
        case HotelFlux.Guardian.Plug.current_resource(conn) do
          %{id: id} -> id
          _ -> nil
        end
    end
  rescue
    _ -> nil
  end
end
