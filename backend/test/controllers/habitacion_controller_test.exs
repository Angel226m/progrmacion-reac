defmodule HotelFluxWeb.HabitacionControllerTest do
  @moduledoc """
  Tests del HabitacionController — endpoints REST.
  Cubre: crear habitación, cambiar estado y manejo de errores HTTP.
  """
  use HotelFluxWeb.ConnCase, async: false

  alias HotelFlux.Domain.Habitacion

  # ── Fixture ─────────────────────────────────────────────

  defp insertar_habitacion(attrs \\ %{}) do
    base = %Habitacion{
      numero: "HC#{System.unique_integer([:positive])}",
      tipo: "simple",
      piso: 1,
      capacidad: 1,
      precio_noche: Decimal.new("80.00"),
      estado: "disponible"
    }

    {:ok, hab} = HotelFlux.Repo.insert(struct(base, attrs))
    hab
  end

  # ── POST /api/v1/habitaciones ────────────────────────────

  describe "POST /api/v1/habitaciones" do
    test "crea habitación con datos válidos", %{conn: conn} do
      conn = conn_con_token(conn, "admin")

      params = %{
        numero: "HC_NEW#{System.unique_integer([:positive])}",
        tipo: "doble",
        piso: 3,
        capacidad: 2,
        precio_noche: "150.00"
      }

      conn = post(conn, "/api/v1/habitaciones", params)
      assert %{"ok" => true, "habitacion" => hab} = json_response(conn, 201)
      assert hab["tipo"] == "doble"
      assert hab["piso"] == 3
    end

    test "retorna 422 con tipo inválido", %{conn: conn} do
      conn = conn_con_token(conn, "admin")

      params = %{numero: "Z99", tipo: "penthouse_inventada", piso: 10, capacidad: 1, precio_noche: "0.00"}
      conn = post(conn, "/api/v1/habitaciones", params)
      assert %{"errors" => _} = json_response(conn, 422)
    end

    test "retorna 401 sin token", %{conn: conn} do
      params = %{numero: "Z01", tipo: "simple", piso: 1, capacidad: 1, precio_noche: "80.00"}
      conn = post(conn, "/api/v1/habitaciones", params)
      assert conn.status in [401, 403]
    end
  end

  # ── PUT /api/v1/habitaciones/:id/estado ──────────────────

  describe "PUT /api/v1/habitaciones/:id/estado" do
    test "cambia estado con transición válida", %{conn: conn} do
      conn_auth = conn_con_token(conn, "recepcionista")
      hab = insertar_habitacion()

      conn_auth = put(conn_auth, "/api/v1/habitaciones/#{hab.id}/estado", %{estado: "reservada"})
      assert %{"ok" => true, "habitacion" => hab_resp} = json_response(conn_auth, 200)
      assert hab_resp["estado"] == "reservada"
    end

    test "retorna 422 con transición inválida", %{conn: conn} do
      conn_auth = conn_con_token(conn, "recepcionista")
      hab = insertar_habitacion(%{estado: "disponible"})

      conn_auth = put(conn_auth, "/api/v1/habitaciones/#{hab.id}/estado", %{estado: "ocupada"})
      assert %{"error" => _} = json_response(conn_auth, 422)
    end

    test "retorna 401 sin token", %{conn: conn} do
      hab = insertar_habitacion()
      conn = put(conn, "/api/v1/habitaciones/#{hab.id}/estado", %{estado: "reservada"})
      assert conn.status in [401, 403]
    end
  end
end
