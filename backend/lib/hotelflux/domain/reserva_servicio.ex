defmodule HotelFlux.Domain.ReservaServicio do
  @moduledoc """
  Entidad de dominio INMUTABLE — Servicio asociado a una reserva.
  """

  defstruct [
    :id,
    :reserva_id,
    :producto_id,
    :dia_numero,
    :precio_unitario,
    :total,
    :fecha_servicio,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    cantidad: 1,
    es_adicional: false,
    estado: "pendiente",
    eliminado: false
  ]

  def calcular_total(precio_unitario, cantidad) do
    Decimal.mult(precio_unitario, cantidad)
  end
end
