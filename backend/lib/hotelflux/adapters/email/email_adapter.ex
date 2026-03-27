defmodule HotelFlux.Adapters.Email.EmailAdapter do
  @moduledoc """
  Adaptador de email — Simulado para desarrollo.
  En producción: Resend, Mailgun, o SMTP.
  """

  require Logger

  def enviar_email_confirmacion(reserva) do
    Logger.info("[Email] Confirmación enviada para reserva #{reserva.id}")
    # Simulación de envío exitoso
    {:ok, %{message_id: "MSG-#{UUID.uuid4() |> String.slice(0..7)}"}}
  end

  def enviar_email_checkout(reserva, total) do
    Logger.info("[Email] Recibo de checkout enviado — Reserva #{reserva.id}, Total: #{total}")
    {:ok, %{message_id: "MSG-#{UUID.uuid4() |> String.slice(0..7)}"}}
  end
end
