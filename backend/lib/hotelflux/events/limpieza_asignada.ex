defmodule HotelFlux.Events.LimpiezaAsignada do
  @moduledoc "Evento inmutable: tarea de limpieza fue asignada."
  alias HotelFlux.Domain.Evento

  def nuevo(tarea, usuario \\ nil, ip \\ nil) do
    payload = %{
      habitacion_id: tarea.habitacion_id,
      empleado_id: tarea.empleado_id
    }
    payload = if usuario, do: Map.merge(payload, %{realizado_por: usuario.nombre, email: usuario.email, rol: usuario.rol}), else: payload
    payload = if ip, do: Map.put(payload, "ip", ip), else: payload
    Evento.nuevo("limpieza_asignada", tarea.id, "tarea_limpieza", payload)
  end
end
