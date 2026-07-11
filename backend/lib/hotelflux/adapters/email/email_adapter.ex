defmodule HotelFlux.Adapters.Email.EmailAdapter do
  @moduledoc """
  Adaptador SIMULADO de email — Solo para desarrollo/test.

  En producción debe reemplazarse por un adaptador real (Resend, Mailgun, SMTP)
  que implemente `HotelFlux.Ports.NotificacionPort`.
  """

  @behaviour HotelFlux.Ports.NotificacionPort

  require Logger

  defp advertencia_produccion do
    :prod |> Mix.env() |> maybe_log_error()
  end

  defp maybe_log_error(:prod), do: Logger.error("[EmailAdapter] ADAPTADOR SIMULADO USADO EN PRODUCCIÓN")
  defp maybe_log_error(_), do: :ok

  @impl true
  def enviar_email_confirmacion(reserva) do
    advertencia_produccion()
    Logger.info("[Email] Confirmación enviada para reserva #{reserva.id}")
    {:ok, %{message_id: "MSG-#{UUID.uuid4() |> String.slice(0..7)}"}}
  end

  @impl true
  def enviar_email_checkout(reserva, total) do
    advertencia_produccion()
    Logger.info("[Email] Recibo de checkout enviado — Reserva #{reserva.id}, Total: #{total}")
    {:ok, %{message_id: "MSG-#{UUID.uuid4() |> String.slice(0..7)}"}}
  end
end
