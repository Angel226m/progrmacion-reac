defmodule HotelFlux.Events.HabitacionLiberada do
  @moduledoc "Evento inmutable: habitación fue liberada (post-checkout)."
  alias HotelFlux.Domain.Evento

  def nuevo(habitacion) do
    Evento.nuevo(
      "habitacion_liberada",
      habitacion.id,
      "habitacion",
      %{
        numero: habitacion.numero,
        piso: habitacion.piso,
        estado_anterior: "ocupada",
        estado_nuevo: "en_limpieza"
      }
    )
  end
end
