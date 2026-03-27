defmodule HotelFlux.Domain.Consumo do
  @moduledoc """
  Entidad de dominio INMUTABLE — Consumo de producto cargado a habitación.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @estados ~w(pendiente entregado cancelado)

  schema "consumos" do
    field :cantidad, :integer, default: 1
    field :precio_unitario, :decimal
    field :total, :decimal
    field :estado, :string, default: "pendiente"

    belongs_to :reserva, HotelFlux.Domain.Reserva
    belongs_to :producto, HotelFlux.Domain.Producto

    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(consumo, attrs) do
    consumo
    |> cast(attrs, [:reserva_id, :producto_id, :cantidad, :precio_unitario, :total, :estado])
    |> validate_required([:reserva_id, :producto_id, :cantidad, :precio_unitario, :total])
    |> validate_inclusion(:estado, @estados)
    |> validate_number(:cantidad, greater_than: 0)
    |> foreign_key_constraint(:reserva_id)
    |> foreign_key_constraint(:producto_id)
  end

  @doc """
  Calcula el total del consumo. FUNCIÓN PURA.
  """
  def calcular_total(precio_unitario, cantidad) do
    Decimal.mult(precio_unitario, cantidad)
  end
end
