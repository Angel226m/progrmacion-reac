defmodule HotelFlux.Domain.Piso do
  @moduledoc """
  Entidad de dominio — Piso del hotel.
  Permite gestionar los pisos (crear, editar, eliminar con soft delete).
  Cada piso contiene múltiples habitaciones.
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

  @doc "Changeset para crear/actualizar un piso"
  def changeset(piso, attrs) do
    piso
    |> cast(attrs, [:numero, :nombre, :descripcion, :activo, :eliminado, :eliminado_en])
    |> validate_required([:numero, :nombre])
    |> validate_number(:numero, greater_than: 0)
    |> unique_constraint(:numero)
  end

  @doc "Marca el piso como eliminado (soft delete)"
  def soft_delete_changeset(piso) do
    changeset(piso, %{eliminado: true, eliminado_en: DateTime.utc_now(), activo: false})
  end
end
