defmodule HotelFlux.Events.CheckinRealizado do
  @moduledoc "Evento inmutable: check-in fue realizado."
  alias HotelFlux.Domain.Evento

  def nuevo(reserva, usuario \\ nil, ip \\ nil) do
    payload = %{
      habitacion_id: reserva.habitacion_id,
      huesped_id: reserva.huesped_id,
      fecha: to_string(DateTime.utc_now())
    }
    payload = if usuario, do: Map.merge(payload, %{realizado_por: usuario.nombre, email: usuario.email, rol: usuario.rol}), else: payload
    payload = if ip, do: Map.put(payload, "ip", ip), else: payload
    Evento.nuevo("checkin_realizado", reserva.id, "reserva", payload)
  end
end
