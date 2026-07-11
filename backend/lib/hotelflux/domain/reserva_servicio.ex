defmodule HotelFlux.Domain.ReservaServicio do
  @moduledoc """
  Entidad de dominio INMUTABLE — Servicio asociado a una reserva.
  """

  @estados_validos ~w(pendiente entregado cancelado)

  defstruct [
    :id,
    :reserva_id,
    :producto_id,
    :dia_numero,
    cantidad: 1,
    :precio_unitario,
    :total,
    es_adicional: false,
    estado: "pendiente",
    :fecha_servicio,
    eliminado: false,
    :eliminado_en,
    :inserted_at,
    :updated_at
  ]

  def calcular_total(precio_unitario, cantidad) do
    Decimal.mult(precio_unitario, cantidad)
  end
end
