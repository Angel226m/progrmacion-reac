defmodule HotelFlux.Domain.Turno do
  @moduledoc """
  Entidad de dominio — Turno de trabajo del hotel.
  Define los tres turnos estándar:
    - Mañana:  08:00 a 16:00
    - Tarde:   16:00 a 00:00
    - Noche:   00:00 a 08:00
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

    has_many :horarios, HotelFlux.Domain.HorarioPersonal

    timestamps(type: :utc_datetime)
  end

  @doc "Changeset para crear/actualizar un turno"
  def changeset(turno, attrs) do
    turno
    |> cast(attrs, [:nombre, :hora_inicio, :hora_fin, :activo, :eliminado, :eliminado_en])
    |> validate_required([:nombre, :hora_inicio, :hora_fin])
  end

  @doc "Marca el turno como eliminado (soft delete)"
  def soft_delete_changeset(turno) do
    changeset(turno, %{eliminado: true, eliminado_en: DateTime.utc_now(), activo: false})
  end

  @doc "Devuelve los turnos predefinidos del hotel"
  def turnos_predefinidos do
    [
      %{nombre: "Mañana", hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00]},
      %{nombre: "Tarde", hora_inicio: ~T[16:00:00], hora_fin: ~T[00:00:00]},
      %{nombre: "Noche", hora_inicio: ~T[00:00:00], hora_fin: ~T[08:00:00]}
    ]
  end
end
