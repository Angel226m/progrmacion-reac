defmodule HotelFlux.Events.ServicioAgregado do
  alias HotelFlux.Domain.Evento

  def nuevo(reserva_servicio, producto, es_adicional, usuario \\ nil, ip \\ nil) do
    payload = %{
      reserva_id: reserva_servicio.reserva_id,
      producto_id: reserva_servicio.producto_id,
      producto_nombre: producto.nombre,
      categoria: producto.categoria,
      dia_numero: reserva_servicio.dia_numero,
      cantidad: reserva_servicio.cantidad,
      precio_unitario: to_string(reserva_servicio.precio_unitario),
      total: to_string(reserva_servicio.total),
      es_adicional: es_adicional
    }
    payload
    |> agregar_usuario(usuario)
    |> agregar_ip(ip)
    |> then(&Evento.nuevo(tipo_evento(es_adicional), reserva_servicio.id, "reserva_servicio", &1))
  end

  defp tipo_evento(true), do: "reserva.servicio_adicional_agregado"
  defp tipo_evento(false), do: "reserva.servicio_agregado"

  defp agregar_usuario(payload, nil), do: payload
  defp agregar_usuario(payload, %{nombre: nombre, email: email, rol: rol}) do
    Map.merge(payload, %{realizado_por: nombre, email: email, rol: rol})
  end
  defp agregar_usuario(payload, _), do: payload

  defp agregar_ip(payload, nil), do: payload
  defp agregar_ip(payload, ip) when is_binary(ip), do: Map.put(payload, "ip", ip)
  defp agregar_ip(payload, _), do: payload
end
