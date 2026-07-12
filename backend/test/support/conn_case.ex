defmodule HotelFluxWeb.ConnCase do
  @moduledoc """
  Case template para tests de controllers Phoenix.
  Configura conexión HTTP, autenticación JWT y sandbox de Ecto.
  """
  use ExUnit.CaseTemplate

  using do
    quote do
      use Phoenix.ConnTest
      import HotelFluxWeb.ConnCase
      alias HotelFluxWeb.Router.Helpers, as: Routes

      @endpoint HotelFluxWeb.Endpoint
    end
  end

  setup tags do
    HotelFlux.DataCase.setup_sandbox(tags)

    conn =
      Phoenix.ConnTest.build_conn()
      |> Plug.Conn.put_req_header("content-type", "application/json")

    {:ok, conn: conn}
  end

  @doc """
  Crea un usuario y retorna la conexión con token JWT Bearer.
  """
  def conn_con_token(conn, rol \\ "recepcionista") do
    email = "ctrl_#{System.unique_integer([:positive])}@test.pe"

    {:ok, usuario} =
      %HotelFlux.Infra.Persistence.Schema.Usuario{
        nombre: "Test Ctrl",
        email: email,
        password_hash: Bcrypt.hash_pwd_salt("Password1"),
        rol: rol,
        activo: true
      }
      |> HotelFlux.Infra.Persistence.Schema.Usuario.changeset(%{password: "Password1"})
      |> HotelFlux.Repo.insert()
      |> case do
        {:ok, u} -> {:ok, struct(HotelFlux.Domain.Usuario, Map.from_struct(u))}
        error -> error
      end

    {:ok, token, _claims} = HotelFlux.Guardian.encode_and_sign(usuario)

    conn
    |> Plug.Conn.put_req_header("authorization", "Bearer #{token}")
  end
end
