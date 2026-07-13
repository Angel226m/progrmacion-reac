defmodule HotelFlux.Domain.Turno do
  @moduledoc """
  Entidad de dominio — Turno de trabajo del hotel.
  Define los tres turnos estándar:
    - Mañana:  08:00 a 16:00
    - Tarde:   16:00 a 00:00
    - Noche:   00:00 a 08:00
  """
  import Ecto.Changeset

  defstruct [
    :id,
    :nombre,
    :hora_inicio,
    :hora_fin,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    activo: true,
    eliminado: false
  ]

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

  @doc "Devuelve los turnos predefinidos del hotel"
  def turnos_predefinidos do
    [
      %{nombre: "Mañana", hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00]},
      %{nombre: "Tarde", hora_inicio: ~T[16:00:00], hora_fin: ~T[00:00:00]},
      %{nombre: "Noche", hora_inicio: ~T[00:00:00], hora_fin: ~T[08:00:00]}
    ]
  end
end
