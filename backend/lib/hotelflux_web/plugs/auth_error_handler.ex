defmodule HotelFluxWeb.Plugs.AuthErrorHandler do
  @moduledoc "Maneja errores de autenticación JWT devolviendo JSON."
  import Plug.Conn

  @behaviour Guardian.Plug.ErrorHandler

  @impl Guardian.Plug.ErrorHandler
  def auth_error(conn, {type, _reason}, _opts) do
    body = Jason.encode!(%{error: to_string(type), message: "No autorizado"})

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(401, body)
  end
end
