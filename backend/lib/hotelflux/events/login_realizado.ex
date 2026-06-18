defmodule HotelFlux.Events.LoginRealizado do
  @moduledoc "Evento inmutable: intento de inicio de sesión (éxito o fallido)."
  alias HotelFlux.Domain.Evento

  def nuevo(email, exitoso, ip, nombre \\ "", rol \\ "") do
    tipo = if exitoso, do: "login_exitoso", else: "login_fallido"
    payload = %{
      email: email,
      ip: ip,
      exitoso: exitoso,
      realizado_por: nombre,
      rol: rol
    }
    Evento.nuevo(tipo, email, "auth", payload)
  end
end
