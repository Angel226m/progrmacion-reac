defmodule HotelFlux.Ports.NotificacionPort do
  @moduledoc """
  Puerto hexagonal — Interfaz para notificaciones.
  Define contratos para envío de emails del sistema.
  """

  @callback enviar_email_confirmacion(struct()) :: {:ok, term()} | {:error, term()}
  @callback enviar_email_checkout(struct(), Decimal.t()) :: {:ok, term()} | {:error, term()}
  @callback enviar_email_recuperacion_contrasena(map()) :: {:ok, term()} | {:error, term()}
end
