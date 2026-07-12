defmodule HotelFlux.Domain.Consumo do
  @moduledoc """
  Entidad de dominio INMUTABLE — Consumo de producto cargado a habitación.
  """

  @estados ~w(pendiente entregado cancelado)

  defstruct [
    :id,
    :reserva_id,
    :producto_id,
    :precio_unitario,
    :total,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    cantidad: 1,
    estado: "pendiente",
    eliminado: false
  ]

  @doc """
  Calcula el total del consumo. FUNCIÓN PURA.
  """
  def calcular_total(precio_unitario, cantidad) do
    Decimal.mult(precio_unitario, cantidad)
  end
end
