defmodule HotelFluxWeb.UserSocket do
  @moduledoc """
  Socket WebSocket autenticado.
  Valida JWT en el handshake inicial para determinar rol y usuario.
  Los canales se unen según el rol del usuario conectado.
  """
  use Phoenix.Socket

  # Canales reactivos — cada uno es un stream independiente
  channel "habitaciones:*", HotelFluxWeb.HabitacionChannel
  channel "limpieza:*", HotelFluxWeb.LimpiezaChannel
  channel "dashboard:*", HotelFluxWeb.DashboardChannel
  channel "notificaciones:*", HotelFluxWeb.NotificacionChannel

  @impl true
  def connect(params, socket, connect_info) do
    token = params_token(params, connect_info)

    case token && HotelFlux.Guardian.decode_and_verify(token) do
      {:ok, claims} ->
        case HotelFlux.Guardian.resource_from_claims(claims) do
          {:ok, usuario} ->
            socket =
              socket
              |> assign(:usuario_id, usuario.id)
              |> assign(:rol, claims["rol"])
              |> assign(:nombre, claims["nombre"])

            {:ok, socket}

          {:error, _reason} ->
            :error
        end

      _ ->
        :error
    end
  end

  defp params_token(%{"token" => token}, _connect_info)
       when is_binary(token) and token != "", do: token

  defp params_token(_params, connect_info) do
    cookies = extract_cookies(connect_info)
    Map.get(cookies, "hotelflux_token")
  end

  defp extract_cookies(%{x_headers: headers}) do
    {_, cookie_str} = Enum.find(headers, {nil, ""}, fn {k, _} -> k == "cookie" end)
    cookie_str
    |> String.split(";")
    |> Enum.map(&String.trim/1)
    |> Enum.reduce(%{}, fn pair, acc ->
      case String.split(pair, "=", parts: 2) do
        [k, v] -> Map.put(acc, String.trim(k), String.trim(v))
        _ -> acc
      end
    end)
  end

  defp extract_cookies(_), do: %{}

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.usuario_id}"
end
