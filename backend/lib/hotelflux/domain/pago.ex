defmodule HotelFlux.Domain.Pago do
  @moduledoc """
  Entidad de dominio INMUTABLE — Registro de pago.
  """

  @metodos ~w(tarjeta efectivo transferencia yape)
  @estados ~w(pendiente completado fallido reversado)

  defstruct [
    :id,
    :reserva_id,
    :monto,
    :metodo,
    estado: "pendiente",
    :referencia_externa,
    eliminado: false,
    :eliminado_en,
    :inserted_at,
    :updated_at
  ]

  @doc "Verifica si el pago fue exitoso. Función pura."
  def completado?(%__MODULE__{estado: "completado"}), do: true
  def completado?(_), do: false
end
