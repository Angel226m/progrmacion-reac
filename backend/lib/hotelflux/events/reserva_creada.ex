defmodule HotelFlux.Events.ReservaCreada do
  @moduledoc "Evento inmutable: una reserva fue creada exitosamente."
  alias HotelFlux.Domain.Evento

  @doc "Crea el evento de reserva creada. FUNCIÓN PURA."
  def nuevo(reserva, usuario \\ nil, ip \\ nil) do
    payload = %{
      huesped_id: reserva.huesped_id,
      habitacion_id: reserva.habitacion_id,
      fecha_entrada: to_string(reserva.fecha_entrada),
      fecha_salida: to_string(reserva.fecha_salida),
      total: to_string(reserva.total)
    }
    payload = if usuario, do: Map.merge(payload, %{realizado_por: usuario.nombre, email: usuario.email, rol: usuario.rol}), else: payload
    payload = if ip, do: Map.put(payload, "ip", ip), else: payload
    Evento.nuevo("reserva_creada", reserva.id, "reserva", payload)
  end
end
