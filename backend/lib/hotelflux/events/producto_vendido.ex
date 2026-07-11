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
    payload
    |> agregar_usuario(usuario)
    |> agregar_ip(ip)
    |> then(&Evento.nuevo("producto_vendido", consumo.id, "consumo", &1))
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
