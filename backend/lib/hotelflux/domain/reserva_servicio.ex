defmodule HotelFlux.Domain.ReservaServicio do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @estados_validos ~w(pendiente entregado cancelado)

  schema "reservas_servicios" do
    field :dia_numero, :integer
    field :cantidad, :integer, default: 1
    field :precio_unitario, :decimal
    field :total, :decimal
    field :es_adicional, :boolean, default: false
    field :estado, :string, default: "pendiente"
    field :fecha_servicio, :date

    belongs_to :reserva, HotelFlux.Domain.Reserva
    belongs_to :producto, HotelFlux.Domain.Producto

    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(servicio, attrs) do
    servicio
    |> cast(attrs, [:reserva_id, :producto_id, :dia_numero, :cantidad, :precio_unitario, :total, :es_adicional, :estado, :fecha_servicio])
    |> validate_required([:reserva_id, :producto_id, :dia_numero, :cantidad, :precio_unitario, :total])
    |> validate_inclusion(:estado, @estados_validos)
    |> validate_number(:dia_numero, greater_than: 0)
    |> validate_number(:cantidad, greater_than: 0)
    |> foreign_key_constraint(:reserva_id)
    |> foreign_key_constraint(:producto_id)
  end

  def calcular_total(precio_unitario, cantidad) do
    Decimal.mult(precio_unitario, cantidad)
  end
end
