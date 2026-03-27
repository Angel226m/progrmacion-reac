defmodule HotelFlux.Ports.PagoPort do
  @moduledoc """
  Puerto hexagonal — Interfaz para operaciones de pago.
  Permite intercambiar el adaptador real (Stripe) por uno simulado sin cambiar el dominio.
  """

  @callback procesar_pago(map()) :: {:ok, struct()} | {:error, :pago_fallido}
  @callback reversar_pago(binary()) :: {:ok, struct()} | {:error, term()}
end
