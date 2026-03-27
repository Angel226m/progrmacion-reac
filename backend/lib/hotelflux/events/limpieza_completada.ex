defmodule HotelFlux.Events.LimpiezaCompletada do
  @moduledoc "Evento inmutable: limpieza fue completada."
  alias HotelFlux.Domain.Evento

  def nuevo(tarea) do
    Evento.nuevo(
      "limpieza_completada",
      tarea.id,
      "tarea_limpieza",
      %{
        habitacion_id: tarea.habitacion_id,
        empleado_id: tarea.empleado_id,
        duracion_minutos: tarea.duracion_minutos
      }
    )
  end
end
