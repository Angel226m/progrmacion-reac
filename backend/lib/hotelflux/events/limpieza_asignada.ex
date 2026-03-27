defmodule HotelFlux.Events.LimpiezaAsignada do
  @moduledoc "Evento inmutable: tarea de limpieza fue asignada."
  alias HotelFlux.Domain.Evento

  def nuevo(tarea) do
    Evento.nuevo(
      "limpieza_asignada",
      tarea.id,
      "tarea_limpieza",
      %{
        habitacion_id: tarea.habitacion_id,
        empleado_id: tarea.empleado_id
      }
    )
  end
end
