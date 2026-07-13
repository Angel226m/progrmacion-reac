defmodule HotelFluxWeb.Plugs.RolePlug do
  @moduledoc """
  Plug que verifica que el usuario tenga uno de los roles permitidos.
  Función pura: verifica claims del JWT sin efectos secundarios.
  """
  import Plug.Conn
  alias HotelFlux.Guardian

  # Recibe la lista de roles permitidos como opción
  def init(opts), do: opts

  # Verifica que el rol del usuario autenticado esté en la lista de roles permitidos
  def call(conn, roles: roles_permitidos) do
    claims = Guardian.Plug.current_claims(conn)
    rol = claims["rol"]
    authorize(conn, rol, roles_permitidos)
  end

  # Si el rol no está permitido, responde con 403 Forbidden
  defp authorize(conn, rol, roles) do
    case Enum.member?(roles, rol) do
      true -> conn
      false ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(403, Jason.encode!(%{error: "forbidden", message: "Rol '#{rol}' no tiene permiso"}))
        |> halt()
    end
  end
end
