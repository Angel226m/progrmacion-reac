defmodule HotelFluxWeb.Plugs.CookieToHeaderPlug do
  @moduledoc """
  Plug que lee el token JWT de la cookie `hotelflux_token` y lo
  copia al header `Authorization` si no hay ya un Bearer explícito.

  Permite que los endpoints protegidos por el pipeline `:auth`
  funcionen también cuando el frontend envía la cookie httpOnly
  (por ejemplo tras un refresh de página donde el token en memoria
  se perdió pero la cookie persistió).
  """
  import Plug.Conn

  @cookie_name "hotelflux_token"

  def init(_opts), do: nil

  def call(conn, _opts) do
    case get_req_header(conn, "authorization") do
      [] ->
        conn
        |> fetch_cookies()
        |> case do
          %{cookies: %{@cookie_name => token}} when is_binary(token) and token != "" ->
            put_req_header(conn, "authorization", "Bearer #{token}")
          _ ->
            conn
        end
      _ ->
        conn
    end
  end
end