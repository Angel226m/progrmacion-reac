defmodule HotelFlux.Domain.ReservaSagaTest do
  @moduledoc """
  Tests de la Saga reactiva de reservas.
  Demuestra: Patrón Saga, compensación automática, pipeline funcional.
  """
  use HotelFlux.DataCase, async: false

  alias HotelFlux.Domain.{Habitacion, Huesped, Usuario}
  alias HotelFlux.UseCases.Saga.ReservaSaga

  setup do
    # Seed random para que PagoAdapter (90% éxito) sea determinista
    :rand.seed(:exsss, {100, 200, 300})

    repo = HotelFlux.Repo

    {:ok, huesped} = repo.insert(%Huesped{
      nombre: "Test",
      apellido: "Usuario",
      email: "test_saga_#{System.unique_integer([:positive])}@test.com"
    })

    {:ok, habitacion} = repo.insert(%Habitacion{
      numero: "T#{System.unique_integer([:positive])}",
      tipo: "doble",
      piso: 1,
      capacidad: 2,
      precio_noche: Decimal.new("150.00"),
      estado: "disponible"
    })

    {:ok, _usuario} = repo.insert(%Usuario{
      nombre: "Limpieza Test",
      email: "limp_#{System.unique_integer([:positive])}@test.com",
      password_hash: Bcrypt.hash_pwd_salt("test123"),
      rol: "limpieza"
    })

    %{huesped: huesped, habitacion: habitacion}
  end

  describe "ejecutar/1 — Saga completa" do
    test "saga exitosa crea reserva y cambia estado de habitación", %{huesped: huesped, habitacion: habitacion} do
      params = %{
        "huesped_id" => huesped.id,
        "tipo_habitacion" => habitacion.tipo,
        "fecha_entrada" => to_string(Date.utc_today()),
        "fecha_salida" => to_string(Date.add(Date.utc_today(), 3)),
        "monto" => "450.00",
        "metodo_pago" => "tarjeta"
      }

      # Con el seed fijo, PagoAdapter debe retornar éxito (90%)
      {:ok, resultado} = ReservaSaga.ejecutar(params)
      assert resultado.saga_id != nil
      assert resultado.reserva != nil
      assert resultado.reserva.estado == "confirmada"
    end

    test "saga exitosa con pago exitoso", %{huesped: huesped, habitacion: habitacion} do
      params = %{
        "huesped_id" => huesped.id,
        "tipo_habitacion" => habitacion.tipo,
        "fecha_entrada" => to_string(Date.utc_today()),
        "fecha_salida" => to_string(Date.add(Date.utc_today(), 3)),
        "monto" => "450.00",
        "metodo_pago" => "tarjeta"
      }

      {:ok, resultado} = ReservaSaga.ejecutar(params)
      assert resultado.saga_id != nil
      assert resultado.reserva != nil
      assert resultado.reserva.estado == "confirmada"
    end

    test "saga retorna error cuando no hay habitación disponible", %{huesped: huesped} do
      params = %{
        "huesped_id" => huesped.id,
        "tipo_habitacion" => "presidencial_inexistente",
        "fecha_entrada" => to_string(Date.utc_today()),
        "fecha_salida" => to_string(Date.add(Date.utc_today(), 3)),
        "monto" => "1000.00"
      }

      assert {:error, resultado} = ReservaSaga.ejecutar(params)
      assert resultado.error =~ "disponibles"
    end
  end
end
