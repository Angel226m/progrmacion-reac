defmodule HotelFlux.Events.HabitacionLiberada do
  @moduledoc "Evento inmutable: habitación fue liberada (post-checkout)."
  alias HotelFlux.Domain.Evento

  def nuevo(habitacion, usuario \\ nil, ip \\ nil) do
    payload = %{
      numero: habitacion.numero,
      piso: habitacion.piso,
      estado_anterior: "ocupada",
      estado_nuevo: "en_limpieza"
    }
    payload = if usuario, do: Map.merge(payload, %{realizado_por: usuario.nombre, email: usuario.email, rol: usuario.rol}), else: payload
    payload = if ip, do: Map.put(payload, "ip", ip), else: payload
    Evento.nuevo("habitacion_liberada", habitacion.id, "habitacion", payload)
  end
end
