defmodule HotelFlux.Domain.Pago do
  @moduledoc """
  Entidad de dominio INMUTABLE — Registro de pago.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @metodos ~w(tarjeta efectivo transferencia yape)
  @estados ~w(pendiente completado fallido reversado)

  schema "pagos" do
    field :monto, :decimal
    field :metodo, :string
    field :estado, :string, default: "pendiente"
    field :referencia_externa, :string

    belongs_to :reserva, HotelFlux.Domain.Reserva

    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(pago, attrs) do
    pago
    |> cast(attrs, [:reserva_id, :monto, :metodo, :estado, :referencia_externa])
    |> validate_required([:monto, :metodo])
    |> validate_inclusion(:metodo, @metodos)
    |> validate_inclusion(:estado, @estados)
    |> validate_number(:monto, greater_than: 0)
    |> foreign_key_constraint(:reserva_id)
  end

  @doc "Verifica si el pago fue exitoso. Función pura."
  def completado?(%__MODULE__{estado: "completado"}), do: true
  def completado?(_), do: false
end
