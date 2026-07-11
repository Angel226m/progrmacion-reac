defmodule HotelFlux.Events.LoginRealizado do
  @moduledoc "Evento inmutable: intento de inicio de sesión (éxito o fallido)."
  alias HotelFlux.Domain.Evento

  def nuevo(email, exitoso, ip, nombre \\ "", rol \\ "") do
    payload = %{
      email: email,
      ip: ip,
      exitoso: exitoso,
      realizado_por: nombre,
      rol: rol
    }
    Evento.nuevo(tipo_evento(exitoso), Ecto.UUID.generate(), "auth", payload)
  end

  defp tipo_evento(true), do: "login_exitoso"
  defp tipo_evento(false), do: "login_fallido"
end
