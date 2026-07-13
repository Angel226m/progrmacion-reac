defmodule HotelFlux.Domain.Piso do
  @moduledoc """
  Entidad de dominio — Piso del hotel.
  Permite gestionar los pisos (crear, editar, eliminar con soft delete).
  Cada piso contiene múltiples habitaciones.
  """
  import Ecto.Changeset

  defstruct [
    :id,
    :numero,
    :nombre,
    :descripcion,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    activo: true,
    eliminado: false
  ]

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
