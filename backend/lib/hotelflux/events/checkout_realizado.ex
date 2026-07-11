defmodule HotelFlux.Events.CheckoutRealizado do
  @moduledoc "Evento inmutable: check-out fue realizado."
  alias HotelFlux.Domain.Evento

  def nuevo(reserva, total_final, usuario \\ nil, ip \\ nil) do
    payload = %{
      habitacion_id: reserva.habitacion_id,
      huesped_id: reserva.huesped_id,
      total_final: to_string(total_final),
      fecha: to_string(DateTime.utc_now())
    }
    payload
    |> agregar_usuario(usuario)
    |> agregar_ip(ip)
    |> then(&Evento.nuevo("checkout_realizado", reserva.id, "reserva", &1))
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
