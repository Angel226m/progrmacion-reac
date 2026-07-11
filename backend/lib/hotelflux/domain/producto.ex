defmodule HotelFlux.Domain.Producto do
  @moduledoc """
  Entidad de dominio INMUTABLE — Producto vendible del hotel.

  Principios FRP:
  - Sin if/else: pattern matching
  - Funciones puras sin efectos secundarios
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @categorias ~w(minibar room_service spa lavanderia tour estacionamiento gimnasio piscina conferencias)

  schema "productos" do
    field :nombre, :string
    field :descripcion, :string
    field :categoria, :string
    field :precio, :decimal
    field :disponible, :boolean, default: true
    field :stock, :integer
    field :imagen_url, :string
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(producto, attrs) do
    producto
    |> cast(attrs, [:nombre, :descripcion, :categoria, :precio, :disponible, :stock, :imagen_url])
    |> validate_required([:nombre, :categoria, :precio])
    |> validate_inclusion(:categoria, @categorias)
    |> validate_number(:precio, greater_than: 0)
  end

  def tiene_stock?(%__MODULE__{stock: nil}), do: true
  def tiene_stock?(%__MODULE__{stock: stock}), do: stock > 0

  def descontar_stock(%__MODULE__{stock: nil}, _cantidad), do: %{}
  def descontar_stock(%__MODULE__{stock: stock}, cantidad), do: %{stock: max(stock - cantidad, 0)}

  def categorias_validas, do: @categorias
end
