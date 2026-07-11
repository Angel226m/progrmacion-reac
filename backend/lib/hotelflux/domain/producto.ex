defmodule HotelFlux.Domain.Producto do
  @moduledoc """
  Entidad de dominio INMUTABLE — Producto vendible del hotel.

  Principios FRP:
  - Sin if/else: pattern matching
  - Funciones puras sin efectos secundarios
  """

  @categorias ~w(minibar room_service spa lavanderia tour estacionamiento gimnasio piscina conferencias)

  defstruct [
    :id,
    :nombre,
    :descripcion,
    :categoria,
    :precio,
    disponible: true,
    :stock,
    :imagen_url,
    eliminado: false,
    :eliminado_en,
    :inserted_at,
    :updated_at
  ]

  def tiene_stock?(%__MODULE__{stock: nil}), do: true
  def tiene_stock?(%__MODULE__{stock: stock}), do: stock > 0

  def descontar_stock(%__MODULE__{stock: nil}, _cantidad), do: %{}
  def descontar_stock(%__MODULE__{stock: stock}, cantidad), do: %{stock: max(stock - cantidad, 0)}

  def categorias_validas, do: @categorias
end
