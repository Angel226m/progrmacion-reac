defmodule HotelFlux.Domain.HorarioPersonal do
  @moduledoc """
  Entidad de dominio — Horario asignado a un empleado.
  Permite al administrador programar los días y turnos de cada empleado.
  Estados: programado, asistio, falta, permiso.
  """

  @dias_semana %{1 => "Lunes", 2 => "Martes", 3 => "Miércoles", 4 => "Jueves",
                  5 => "Viernes", 6 => "Sábado", 7 => "Domingo"}

  defstruct [
    :id,
    :empleado_id,
    :turno_id,
    :fecha,
    :dia_semana,
    :notas,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    estado: "programado",
    eliminado: false
  ]

  @doc "Retorna el nombre del día de la semana"
  def nombre_dia(dia_numero), do: Map.get(@dias_semana, dia_numero, "Desconocido")

  @doc "Días de la semana disponibles"
  def dias_semana, do: @dias_semana
end
