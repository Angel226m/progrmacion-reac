defmodule HotelFlux.Adapters.Email.EmailAdapter do
  @moduledoc """
  🔴 ADAPTADOR SIMULADO — Solo para desarrollo/test.

  NO USAR EN PRODUCCIÓN. En producción debe reemplazarse por un
  adaptador real (Resend, Mailgun, SMTP) que implemente el puerto
  `HotelFlux.Ports.NotificacionPort`.

  Para intercambiar el adaptador:
    1. Crear un nuevo módulo que implemente `@behaviour NotificacionPort`
    2. Configurar en runtime.exs: `config :hotelflux, :email_adapter, MiAdapter`
    3. Cambiar las referencias en email_worker.ex para usar el adapter configurado
  """

  @behaviour HotelFlux.Ports.NotificacionPort

  require Logger

  defp advertencia_produccion do
    if Application.get_env(:hotelflux, :env) == :prod do
      Logger.error("[EmailAdapter] ADAPTADOR SIMULADO USADO EN PRODUCCIÓN — configure un adaptador real")
    end
  end

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
