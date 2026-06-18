defmodule HotelFlux.Events.ProductoVendido do
  @moduledoc "Evento inmutable: producto vendido/cargado a habitación."
  alias HotelFlux.Domain.Evento

  def nuevo(consumo, producto, usuario \\ nil, ip \\ nil) do
    payload = %{
      producto_id: consumo.producto_id,
      reserva_id: consumo.reserva_id,
      producto_nombre: producto.nombre,
      categoria: producto.categoria,
      cantidad: consumo.cantidad,
      total: to_string(consumo.total)
    }
    payload = if usuario, do: Map.merge(payload, %{realizado_por: usuario.nombre, email: usuario.email, rol: usuario.rol}), else: payload
    payload = if ip, do: Map.put(payload, "ip", ip), else: payload
    Evento.nuevo("producto_vendido", consumo.id, "consumo", payload)
  end
end
