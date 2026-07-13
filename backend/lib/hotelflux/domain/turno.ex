defmodule HotelFlux.Domain.Turno do
  @moduledoc """
  Entidad de dominio — Turno de trabajo del hotel.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "turnos" do
    field :nombre, :string
    field :hora_inicio, :time
    field :hora_fin, :time
    field :activo, :boolean, default: true
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  def changeset(turno, attrs) do
    turno
    |> cast(attrs, [:nombre, :hora_inicio, :hora_fin, :activo])
    |> validate_required([:nombre, :hora_inicio])
  end

  def soft_delete_changeset(turno) do
    turno
    |> change()
    |> put_change(:eliminado, true)
    |> put_change(:eliminado_en, DateTime.utc_now())
  end

  def turnos_predefinidos do
    [
      %{nombre: "Mañana", hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00]},
      %{nombre: "Tarde", hora_inicio: ~T[16:00:00], hora_fin: ~T[00:00:00]},
      %{nombre: "Noche", hora_inicio: ~T[00:00:00], hora_fin: ~T[08:00:00]}
    ]
  end
end
