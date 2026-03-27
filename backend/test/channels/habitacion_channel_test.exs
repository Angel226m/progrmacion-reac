defmodule HotelFluxWeb.HabitacionChannelTest do
  @moduledoc """
  Test del canal WebSocket de habitaciones.
  Demuestra: Streams reactivos en tiempo real, PubSub.
  """
  use HotelFlux.ChannelCase, async: false

  alias HotelFlux.Domain.{Habitacion, Usuario}
  alias HotelFlux.Repo

  setup do
    {:ok, _hab} = Repo.insert(%Habitacion{
      numero: "CH#{System.unique_integer([:positive])}",
      tipo: "simple", piso: 1, capacidad: 1,
      precio_noche: Decimal.new("80.00"), estado: "disponible"
    })

    {:ok, usuario} = Repo.insert(%Usuario{
      nombre: "Test Recep",
      email: "recep_ch_#{System.unique_integer([:positive])}@test.com",
      password_hash: Bcrypt.hash_pwd_salt("test123"),
      rol: "recepcionista"
    })

    {:ok, token, _} = HotelFlux.Guardian.generate_token(usuario)

    {:ok, socket} = connect(HotelFluxWeb.UserSocket, %{"token" => token})

    %{socket: socket}
  end

  describe "join habitaciones:lobby" do
    test "se une al canal y recibe habitaciones iniciales", %{socket: socket} do
      {:ok, reply, _socket} = subscribe_and_join(socket, "habitaciones:lobby", %{})
      assert is_list(reply.habitaciones)
    end
  end

  describe "broadcast reactivo" do
    test "recibe actualización cuando una habitación cambia de estado", %{socket: socket} do
      {:ok, _reply, _socket} = subscribe_and_join(socket, "habitaciones:lobby", %{})

      # Simular broadcast del PubSub
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, "habitaciones", {
        :habitacion_actualizada,
        %{id: "test-id", numero: "999", estado: "ocupada", piso: 1}
      })

      # Verificar que el cliente recibe el evento
      assert_push "habitacion_actualizada", %{id: "test-id", estado: "ocupada"}
    end
  end
end
