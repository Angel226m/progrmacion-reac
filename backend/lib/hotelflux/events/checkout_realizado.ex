defmodule HotelFlux.Events.CheckoutRealizado do
  @moduledoc "Evento inmutable: check-out fue realizado."
  alias HotelFlux.Domain.Evento

  def nuevo(reserva, total_final, usuario \\ nil, ip \\ nil) do
    payload = %{
      habitacion_id: reserva.habitacion_id,
      huesped_id: reserva.huesped_id,
      total_final: to_string(total_final),
      fecha: to_string(DateTime.utc_now())
    }
    payload = if usuario, do: Map.merge(payload, %{realizado_por: usuario.nombre, email: usuario.email, rol: usuario.rol}), else: payload
    payload = if ip, do: Map.put(payload, "ip", ip), else: payload
    Evento.nuevo("checkout_realizado", reserva.id, "reserva", payload)
  end
end
