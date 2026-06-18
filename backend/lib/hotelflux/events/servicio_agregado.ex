defmodule HotelFlux.Events.ServicioAgregado do
  alias HotelFlux.Domain.Evento

  def nuevo(reserva_servicio, producto, es_adicional, usuario \\ nil, ip \\ nil) do
    tipo = if es_adicional, do: "reserva.servicio_adicional_agregado", else: "reserva.servicio_agregado"
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
    payload = if usuario, do: Map.merge(payload, %{realizado_por: usuario.nombre, email: usuario.email, rol: usuario.rol}), else: payload
    payload = if ip, do: Map.put(payload, "ip", ip), else: payload
    Evento.nuevo(tipo, reserva_servicio.id, "reserva_servicio", payload)
  end
end
