defmodule HotelFlux.Events.LimpiezaAsignada do
  @moduledoc "Evento inmutable: tarea de limpieza fue asignada."
  alias HotelFlux.Domain.Evento

  def nuevo(tarea, usuario \\ nil, ip \\ nil) do
    payload = %{
      habitacion_id: tarea.habitacion_id,
      empleado_id: tarea.empleado_id
    }
    payload
    |> agregar_usuario(usuario)
    |> agregar_ip(ip)
    |> then(&Evento.nuevo("limpieza_asignada", tarea.id, "tarea_limpieza", &1))
  end

  defp agregar_usuario(payload, nil), do: payload
  defp agregar_usuario(payload, %{nombre: nombre, email: email, rol: rol}) do
    Map.merge(payload, %{realizado_por: nombre, email: email, rol: rol})
  end
  defp agregar_usuario(payload, _), do: payload

  defp agregar_ip(payload, nil), do: payload
  defp agregar_ip(payload, ip) when is_binary(ip), do: Map.put(payload, "ip", ip)
  defp agregar_ip(payload, _), do: payload
end
