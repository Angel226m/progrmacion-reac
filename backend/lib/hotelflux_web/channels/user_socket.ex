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
  def connect(%{"token" => token}, socket, _connect_info) do
    case HotelFlux.Guardian.decode_and_verify(token) do
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

      {:error, _reason} ->
        :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.usuario_id}"
end
