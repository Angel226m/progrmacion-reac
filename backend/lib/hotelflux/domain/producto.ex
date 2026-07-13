defmodule HotelFlux.Domain.Producto do
  @moduledoc """
  Módulo de dominio para la entidad Producto (servicio o artículo vendible del hotel).
  Define el esquema, validaciones de precio y categoría,
  y funciones para gestión de stock.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # Categorías predefinidas para productos y servicios del hotel
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

  @doc """
  Cambioset de Ecto para validar atributos de un producto.
  Validaciones: nombre, categoría y precio requeridos; categoría debe ser válida; precio > 0.
  """
  def changeset(producto, attrs) do
    producto
    |> cast(attrs, [:nombre, :descripcion, :categoria, :precio, :stock, :disponible])
    |> validate_required([:nombre, :categoria, :precio])
    |> validate_inclusion(:categoria, @categorias)
    # Validación personalizada: precio debe ser un número positivo o Decimal > 0
    |> validate_change(:precio, fn :precio, value ->
      cond do
        is_nil(value) -> []
        is_struct(value, Decimal) and Decimal.compare(value, Decimal.new("0")) == :gt -> []
        is_number(value) and value > 0 -> []
        true -> [precio: "must be greater than 0"]
      end
    end)
  end

  @doc """
  Verifica si un producto tiene stock disponible.
  stock = nil significa stock ilimitado. Función pura — predicado.
  """
  def tiene_stock?(%__MODULE__{stock: nil}), do: true
  def tiene_stock?(%__MODULE__{stock: stock}), do: stock > 0

  @doc """
  Descuenta una cantidad del stock del producto.
  Si stock es nil (ilimitado), retorna mapa vacío (sin cambios).
  Función pura — retorna mapa de cambios, no muta el struct.
  """
  def descontar_stock(producto, cantidad \\ 1)
  # Stock ilimitado: no se descuenta
  def descontar_stock(%__MODULE__{stock: nil}, _cantidad), do: %{}
  # Stock limitado: descuenta sin bajar de 0
  def descontar_stock(%__MODULE__{stock: stock}, cantidad), do: %{stock: max(stock - cantidad, 0)}

  @doc "Retorna la lista de categorías válidas. Función pura."
  def categorias_validas, do: @categorias
end
