defmodule HotelFlux.Ports.NotificacionPort do
  @moduledoc """
  Puerto hexagonal — Interfaz para notificaciones.
  """

  @callback enviar_email_confirmacion(struct()) :: {:ok, term()} | {:error, term()}
  @callback enviar_email_checkout(struct(), Decimal.t()) :: {:ok, term()} | {:error, term()}
end
