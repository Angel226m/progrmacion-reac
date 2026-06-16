defmodule HotelFluxWeb.LimpiezaChannelTest do
  use HotelFlux.ChannelCase, async: false

  alias HotelFlux.Domain.Usuario

  setup do
    repo = HotelFlux.Repo

    {:ok, usuario} = repo.insert(%Usuario{
      nombre: "Limpieza Test",
      email: "limp_ch_#{System.unique_integer([:positive])}@test.com",
      password_hash: Bcrypt.hash_pwd_salt("test123"),
      rol: "limpieza"
    })

    {:ok, token, _} = HotelFlux.Guardian.generate_token(usuario)
    {:ok, socket} = connect(HotelFluxWeb.UserSocket, %{"token" => token})

    %{socket: socket, usuario: usuario}
  end

  describe "join limpieza:empleado_id" do
    test "personal de limpieza puede unirse a su canal", %{socket: socket, usuario: usuario} do
      {:ok, reply, _socket} = subscribe_and_join(socket, "limpieza:#{usuario.id}", %{})
      assert reply == %{}
    end
  end

  describe "stream de tareas" do
    test "recibe nueva tarea cuando hay checkout", %{socket: socket, usuario: usuario} do
      {:ok, _reply, _socket} = subscribe_and_join(socket, "limpieza:#{usuario.id}", %{})

      Phoenix.PubSub.broadcast(HotelFlux.PubSub, "limpieza", {
        :nueva_tarea,
        %{id: "tarea-1", habitacion_id: "hab-1", empleado_id: usuario.id,
          estado: "pendiente", habitacion_numero: "101", piso: 1}
      })

      assert_push "nueva_tarea", %{habitacion_numero: "101"}
    end
  end
end
