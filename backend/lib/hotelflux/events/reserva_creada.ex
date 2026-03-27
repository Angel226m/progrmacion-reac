defmodule HotelFlux.Events.ReservaCreada do
  @moduledoc "Evento inmutable: una reserva fue creada exitosamente."
  alias HotelFlux.Domain.Evento

  @doc "Crea el evento de reserva creada. FUNCIÓN PURA."
  def nuevo(reserva) do
    Evento.nuevo(
      "reserva_creada",
      reserva.id,
      "reserva",
      %{
        huesped_id: reserva.huesped_id,
        habitacion_id: reserva.habitacion_id,
        fecha_entrada: to_string(reserva.fecha_entrada),
        fecha_salida: to_string(reserva.fecha_salida),
        total: to_string(reserva.total)
      }
    )
  end
end
