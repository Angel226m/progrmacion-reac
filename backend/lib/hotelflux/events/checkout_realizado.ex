defmodule HotelFlux.Events.CheckoutRealizado do
  @moduledoc "Evento inmutable: check-out fue realizado."
  alias HotelFlux.Domain.Evento

  def nuevo(reserva, total_final) do
    Evento.nuevo(
      "checkout_realizado",
      reserva.id,
      "reserva",
      %{
        habitacion_id: reserva.habitacion_id,
        huesped_id: reserva.huesped_id,
        total_final: to_string(total_final),
        fecha: to_string(DateTime.utc_now())
      }
    )
  end
end
