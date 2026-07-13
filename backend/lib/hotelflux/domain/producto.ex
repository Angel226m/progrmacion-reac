defmodule HotelFlux.Domain.Producto do
  @moduledoc """
  Entidad de dominio INMUTABLE — Producto vendible del hotel.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  @categorias ~w(minibar room_service spa lavanderia tour estacionamiento gimnasio piscina conferencias)

  schema "productos" do
    field :nombre, :string
    field :descripcion, :string
    field :categoria, :string
    field :precio, :decimal
    field :stock, :integer
    field :imagen_url, :string
    field :disponible, :boolean, default: true
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime
    timestamps(type: :utc_datetime)
  end

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
