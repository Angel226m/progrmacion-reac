defmodule HotelFluxWeb.Plugs.RolePlug do
  @moduledoc """
  Plug que verifica que el usuario tenga uno de los roles permitidos.
  Función pura: verifica claims del JWT sin efectos secundarios.
  """
  import Plug.Conn
  alias HotelFlux.Guardian

  def init(opts), do: opts

  def call(conn, roles: roles_permitidos) do
    claims = Guardian.Plug.current_claims(conn)
    rol = claims["rol"]
    authorize(conn, rol, roles_permitidos)
  end

  defp authorize(conn, rol, roles) when rol in roles, do: conn

  defp authorize(conn, rol, _roles) do
    body = Jason.encode!(%{error: "forbidden", message: "Rol '#{rol}' no tiene permiso"})

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(403, body)
    |> halt()
  end
end
