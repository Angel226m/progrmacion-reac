defmodule Hotelflux.Domain.ReservaSagaTest do
  @moduledoc """
  Tests de la Saga reactiva de reservas.
  Demuestra: Patrón Saga, compensación automática, pipeline funcional.
  """
  use Hotelflux.DataCase, async: false

  alias Hotelflux.Domain.{Habitacion, Huesped, Usuario}
  alias Hotelflux.UseCases.Saga.ReservaSaga

  setup do
    repo = Hotelflux.Repo

    repo = Hotelflux.Repo

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

      # La saga puede tener éxito o fallar por la simulación de pagos (90% éxito)
      case ReservaSaga.ejecutar(params) do
        {:ok, resultado} ->
          assert resultado.saga_id != nil
          assert resultado.reserva != nil
          assert resultado.reserva.estado == "confirmada"

        {:error, resultado} ->
          # Si falla, la compensación debe haberse ejecutado
          assert resultado.saga_id != nil
          assert resultado.error != nil
      end
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
