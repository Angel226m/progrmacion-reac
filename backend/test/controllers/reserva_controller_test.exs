defmodule HotelFluxWeb.ReservaControllerTest do
  @moduledoc """
  Tests del ReservaController — endpoints REST.
  Cubre: creación directa, saga de reserva y errores de validación.
  """
  use HotelFluxWeb.ConnCase, async: false

  alias HotelFlux.Domain.{Habitacion, Huesped}

  # ── Fixtures ────────────────────────────────────────────

  defp insertar_habitacion do
    {:ok, h} =
      HotelFlux.Repo.insert(%Habitacion{
        numero: "RV#{System.unique_integer([:positive])}",
        tipo: "doble",
        piso: 2,
        capacidad: 2,
        precio_noche: Decimal.new("120.00"),
        estado: "disponible"
      })

    h
  end

  defp insertar_huesped do
    {:ok, h} =
      HotelFlux.Repo.insert(%Huesped{
        nombre: "Reserva",
        apellido: "Test",
        email: "rv_#{System.unique_integer([:positive])}@test.pe"
      })

    h
  end

  # ── POST /api/v1/reservas ────────────────────────────────

  describe "POST /api/v1/reservas" do
    setup do
      # Seed para PagoAdapter determinista (90% éxito → siempre éxito)
      :rand.seed(:exsss, {100, 200, 300})
      :ok
    end

    test "crea reserva con datos válidos", %{conn: conn} do
      conn_auth = conn_con_token(conn, "recepcionista")
      hab = insertar_habitacion()
      hue = insertar_huesped()

      params = %{
        habitacion_id: hab.id,
        huesped_id: hue.id,
        fecha_entrada: Date.utc_today() |> Date.to_string(),
        fecha_salida: Date.utc_today() |> Date.add(3) |> Date.to_string()
      }

      conn_auth = post(conn_auth, "/api/v1/reservas", params)
      assert conn_auth.status == 201
    end

    test "retorna 422 sin habitacion_id", %{conn: conn} do
      conn_auth = conn_con_token(conn, "recepcionista")
      hue = insertar_huesped()

      params = %{
        huesped_id: hue.id,
        fecha_entrada: Date.utc_today() |> Date.to_string(),
        fecha_salida: Date.utc_today() |> Date.add(2) |> Date.to_string()
      }

      conn_auth = post(conn_auth, "/api/v1/reservas", params)
      assert conn_auth.status == 422
    end

    test "retorna 401 sin token", %{conn: conn} do
      params = %{habitacion_id: Ecto.UUID.generate(), huesped_id: Ecto.UUID.generate()}
      conn = post(conn, "/api/v1/reservas", params)
      assert conn.status in [401, 403]
    end
  end

  # ── POST /api/v1/reservas/directa ───────────────────────

  describe "POST /api/v1/reservas/directa — crea huésped y reserva en una operación" do
    test "crea reserva directa con huésped nuevo", %{conn: conn} do
      conn_auth = conn_con_token(conn, "recepcionista")
      hab = insertar_habitacion()

      params = %{
        habitacion_id: hab.id,
        huesped: %{
          nombre: "Directo",
          apellido: "Test",
          email: "dir_#{System.unique_integer([:positive])}@test.pe"
        },
        fecha_entrada: Date.utc_today() |> Date.to_string(),
        fecha_salida: Date.utc_today() |> Date.add(1) |> Date.to_string()
      }

      conn_auth = post(conn_auth, "/api/v1/reservas/directa", params)
      assert conn_auth.status == 201
    end

    test "retorna 422 con datos de huésped inválidos", %{conn: conn} do
      conn_auth = conn_con_token(conn, "recepcionista")
      hab = insertar_habitacion()

      params = %{
        habitacion_id: hab.id,
        huesped: %{nombre: "Sin", apellido: "Email"},
        fecha_entrada: Date.utc_today() |> Date.to_string(),
        fecha_salida: Date.utc_today() |> Date.add(1) |> Date.to_string()
      }

      conn_auth = post(conn_auth, "/api/v1/reservas/directa", params)
      assert conn_auth.status == 422
    end
  end
end
