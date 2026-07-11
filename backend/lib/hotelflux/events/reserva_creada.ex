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

    payload
    |> agregar_usuario(usuario)
    |> agregar_ip(ip)
    |> then(&Evento.nuevo("reserva_creada", reserva.id, "reserva", &1))
  end

  defp agregar_usuario(payload, nil), do: payload
  defp agregar_usuario(payload, %{nombre: nombre, email: email, rol: rol}) do
    Map.merge(payload, %{realizado_por: nombre, email: email, rol: rol})
  end
  defp agregar_usuario(payload, _usuario), do: payload

  defp agregar_ip(payload, nil), do: payload
  defp agregar_ip(payload, ip) when is_binary(ip), do: Map.put(payload, "ip", ip)
  defp agregar_ip(payload, _ip), do: payload
end
