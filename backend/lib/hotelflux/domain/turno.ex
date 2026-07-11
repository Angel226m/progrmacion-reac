defmodule HotelFlux.Domain.Turno do
  @moduledoc """
  Entidad de dominio — Turno de trabajo del hotel.
  Define los tres turnos estándar:
    - Mañana:  08:00 a 16:00
    - Tarde:   16:00 a 00:00
    - Noche:   00:00 a 08:00
  """

  defstruct [
    :id,
    :nombre,
    :hora_inicio,
    :hora_fin,
    activo: true,
    eliminado: false,
    :eliminado_en,
    :inserted_at,
    :updated_at
  ]

  @doc "Devuelve los turnos predefinidos del hotel"
  def turnos_predefinidos do
    [
      %{nombre: "Mañana", hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00]},
      %{nombre: "Tarde", hora_inicio: ~T[16:00:00], hora_fin: ~T[00:00:00]},
      %{nombre: "Noche", hora_inicio: ~T[00:00:00], hora_fin: ~T[08:00:00]}
    ]
  end
end
