defmodule HotelFlux.Events.CheckinRealizado do
  @moduledoc "Evento inmutable: check-in fue realizado."
  alias HotelFlux.Domain.Evento

  def nuevo(reserva) do
    Evento.nuevo(
      "checkin_realizado",
      reserva.id,
      "reserva",
      %{
        habitacion_id: reserva.habitacion_id,
        huesped_id: reserva.huesped_id,
        fecha: to_string(DateTime.utc_now())
      }
    )
  end
end
