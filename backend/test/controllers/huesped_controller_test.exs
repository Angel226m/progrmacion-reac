defmodule HotelFluxWeb.HuespedControllerTest do
  @moduledoc """
  Tests del HuespedController — endpoints REST.
  Cubre: crear huésped, actualizar y manejo de errores.
  """
  use HotelFluxWeb.ConnCase, async: false

  alias HotelFlux.Domain.Huesped

  defp email_unico, do: "ctl_#{System.unique_integer([:positive])}@test.pe"

  defp insertar_huesped do
    {:ok, h} =
      HotelFlux.Repo.insert(%Huesped{
        nombre: "Ctrl",
        apellido: "Test",
        email: email_unico()
      })

    h
  end

  # ── POST /api/v1/huespedes ───────────────────────────────

  describe "POST /api/v1/huespedes" do
    test "crea huésped con datos válidos", %{conn: conn} do
      conn = conn_con_token(conn, "recepcionista")

      params = %{nombre: "Ana", apellido: "Ramos", email: email_unico(), telefono: "+51999000111"}
      conn = post(conn, "/api/v1/huespedes", params)

      assert %{"ok" => true, "huesped" => huesped} = json_response(conn, 201)
      assert huesped["nombre"] == "Ana"
      assert huesped["apellido"] == "Ramos"
    end

    test "retorna 422 sin nombre", %{conn: conn} do
      conn = conn_con_token(conn, "recepcionista")
      params = %{apellido: "Sin nombre", email: email_unico()}
      conn = post(conn, "/api/v1/huespedes", params)
      assert %{"errors" => errors} = json_response(conn, 422)
      assert Map.has_key?(errors, "nombre")
    end

    test "retorna 422 con email duplicado", %{conn: conn} do
      conn_auth = conn_con_token(conn, "recepcionista")
      email = email_unico()
      HotelFlux.Repo.insert!(%Huesped{nombre: "A", apellido: "B", email: email})

      conn_auth = post(conn_auth, "/api/v1/huespedes", %{nombre: "C", apellido: "D", email: email})
      assert %{"errors" => _} = json_response(conn_auth, 422)
    end

    test "retorna 422 con email malformado", %{conn: conn} do
      conn = conn_con_token(conn, "recepcionista")
      params = %{nombre: "X", apellido: "Y", email: "malformado"}
      conn = post(conn, "/api/v1/huespedes", params)
      assert %{"errors" => _} = json_response(conn, 422)
    end

    test "retorna 401 sin token", %{conn: conn} do
      params = %{nombre: "Ana", apellido: "Ramos", email: email_unico()}
      conn = post(conn, "/api/v1/huespedes", params)
      assert conn.status in [401, 403]
    end
  end

  # ── PUT /api/v1/huespedes/:id ────────────────────────────

  describe "PUT /api/v1/huespedes/:id" do
    test "actualiza huésped existente", %{conn: conn} do
      conn_auth = conn_con_token(conn, "recepcionista")
      huesped = insertar_huesped()

      conn_auth = put(conn_auth, "/api/v1/huespedes/#{huesped.id}", %{telefono: "+51888999000"})
      assert %{"ok" => true, "huesped" => resp} = json_response(conn_auth, 200)
      assert resp["telefono"] == "+51888999000"
    end

    test "retorna 401 sin token al actualizar", %{conn: conn} do
      huesped = insertar_huesped()
      conn = put(conn, "/api/v1/huespedes/#{huesped.id}", %{nombre: "Hack"})
      assert conn.status in [401, 403]
    end
  end
end
