defmodule HotelFlux.Events.LimpiezaCompletada do
  @moduledoc "Evento inmutable: limpieza fue completada."
  alias HotelFlux.Domain.Evento

  def nuevo(tarea, usuario \\ nil, ip \\ nil) do
    payload = %{
      habitacion_id: tarea.habitacion_id,
      empleado_id: tarea.empleado_id,
      duracion_minutos: tarea.duracion_minutos
    }
    payload = if usuario, do: Map.merge(payload, %{realizado_por: usuario.nombre, email: usuario.email, rol: usuario.rol}), else: payload
    payload = if ip, do: Map.put(payload, "ip", ip), else: payload
    Evento.nuevo("limpieza_completada", tarea.id, "tarea_limpieza", payload)
  end
end
