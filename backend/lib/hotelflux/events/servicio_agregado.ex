defmodule HotelFlux.Events.ServicioAgregado do
  alias HotelFlux.Domain.Evento

  def nuevo(reserva_servicio, producto, es_adicional) do
    tipo = if es_adicional, do: "reserva.servicio_adicional_agregado", else: "reserva.servicio_agregado"

    Evento.nuevo(
      tipo,
      reserva_servicio.id,
      "reserva_servicio",
      %{
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
    )
  end
end
