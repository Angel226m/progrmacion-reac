defmodule HotelFlux.Domain.Producto do
  @moduledoc """
  Entidad de dominio INMUTABLE — Producto vendible del hotel.

  Principios FRP:
  - Sin if/else: pattern matching
  - Funciones puras sin efectos secundarios
  """
  import Ecto.Changeset

  @categorias ~w(minibar room_service spa lavanderia tour estacionamiento gimnasio piscina conferencias)

  defstruct [
    :id,
    :nombre,
    :descripcion,
    :categoria,
    :precio,
    :stock,
    :imagen_url,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    disponible: true,
    eliminado: false
  ]

  def changeset(producto, attrs) do
    producto
    |> cast(attrs, [:nombre, :descripcion, :categoria, :precio, :stock, :disponible])
    |> validate_required([:nombre, :categoria, :precio])
    |> validate_inclusion(:categoria, @categorias)
    |> validate_change(:precio, fn :precio, value ->
      cond do
        is_nil(value) -> []
        is_struct(value, Decimal) and Decimal.compare(value, Decimal.new("0")) == :gt -> []
        is_number(value) and value > 0 -> []
        true -> [precio: "must be greater than 0"]
      end
    end)
  end

  def tiene_stock?(%__MODULE__{stock: nil}), do: true
  def tiene_stock?(%__MODULE__{stock: stock}), do: stock > 0

  def descontar_stock(producto, cantidad \\ 1)
  def descontar_stock(%__MODULE__{stock: nil}, _cantidad), do: %{}
  def descontar_stock(%__MODULE__{stock: stock}, cantidad), do: %{stock: max(stock - cantidad, 0)}

  def categorias_validas, do: @categorias
end
