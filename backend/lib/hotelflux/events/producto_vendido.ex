defmodule HotelFlux.Events.ProductoVendido do
  @moduledoc "Evento inmutable: producto vendido/cargado a habitación."
  alias HotelFlux.Domain.Evento

  def nuevo(consumo, producto) do
    Evento.nuevo(
      "producto_vendido",
      consumo.id,
      "consumo",
      %{
        producto_id: consumo.producto_id,
        reserva_id: consumo.reserva_id,
        producto_nombre: producto.nombre,
        categoria: producto.categoria,
        cantidad: consumo.cantidad,
        total: to_string(consumo.total)
      }
    )
  end
end
