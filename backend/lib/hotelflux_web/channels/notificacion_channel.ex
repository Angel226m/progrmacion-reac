defmodule HotelFluxWeb.NotificacionChannel do
  @moduledoc """
  Canal WebSocket reactivo — Stream de alertas/notificaciones globales.
  """
  use Phoenix.Channel

  @impl true
  def join("notificaciones:global", _params, socket) do
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, "notificaciones")
    {:ok, socket}
  end

  @impl true
  def handle_info({:alerta, data}, socket) do
    push(socket, "alerta", data)
    {:noreply, socket}
  end
end
