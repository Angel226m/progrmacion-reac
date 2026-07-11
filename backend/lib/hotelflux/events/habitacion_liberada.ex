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
    payload
    |> agregar_usuario(usuario)
    |> agregar_ip(ip)
    |> then(&Evento.nuevo("habitacion_liberada", habitacion.id, "habitacion", &1))
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
