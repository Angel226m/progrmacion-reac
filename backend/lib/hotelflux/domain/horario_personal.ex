defmodule HotelFlux.Domain.HorarioPersonal do
  @moduledoc """
  Entidad de dominio PURA — Horario asignado a un empleado.
  Sin dependencias de Ecto. Las validaciones pertenecen a la capa de schemas.
  Estados: programado, asistio, falta, permiso.
  """

  @estados_validos ~w(programado asistio falta permiso)
  @dias_semana %{1 => "Lunes", 2 => "Martes", 3 => "Miércoles", 4 => "Jueves",
                  5 => "Viernes", 6 => "Sábado", 7 => "Domingo"}

  defstruct [
    :id,
    :empleado_id,
    :turno_id,
    :empleado,
    :turno,
    :fecha,
    :dia_semana,
    :notas,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    estado: "programado",
    eliminado: false
  ]

  @doc "Retorna el nombre del día de la semana según su número (1=Lunes...7=Domingo)."
  def nombre_dia(dia_numero), do: Map.get(@dias_semana, dia_numero, "Desconocido")

  @doc "Mapa de días de la semana: número → nombre."
  def dias_semana, do: @dias_semana

  @doc "Estados válidos para un horario."
  def estados_validos, do: @estados_validos
end
