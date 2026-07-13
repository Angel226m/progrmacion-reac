defmodule HotelFlux.Domain.Piso do
  @moduledoc """
  Entidad de dominio — Piso del hotel.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "pisos" do
    field :numero, :integer
    field :nombre, :string
    field :descripcion, :string
    field :activo, :boolean, default: true
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  def changeset(piso, attrs) do
    piso
    |> cast(attrs, [:numero, :nombre, :descripcion, :activo])
    |> validate_required([:numero, :nombre])
  end

  def soft_delete_changeset(piso) do
    piso
    |> change()
    |> put_change(:eliminado, true)
    |> put_change(:eliminado_en, DateTime.utc_now())
  end
end
