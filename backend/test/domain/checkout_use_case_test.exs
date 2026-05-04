defmodule Hotelflux.Domain.CheckoutUseCaseTest do
  @moduledoc """
  Tests del caso de uso Checkout.
  Demuestra: fan-out reactivo, pipeline funcional, event sourcing.
  """
  use Hotelflux.DataCase, async: false

  alias Hotelflux.Domain.{Habitacion, Huesped, Reserva, Usuario}
  alias Hotelflux.UseCases.CheckoutUseCase

  setup do
    repo = Hotelflux.Repo

    {:ok, huesped} = repo.insert(%Huesped{
      nombre: "Test",
      apellido: "Checkout",
      email: "checkout_#{System.unique_integer([:positive])}@test.com"
    })

    {:ok, habitacion} = repo.insert(%Habitacion{
      numero: "CO#{System.unique_integer([:positive])}",
      tipo: "doble",
      piso: 1,
      capacidad: 2,
      precio_noche: Decimal.new("100.00"),
      estado: "ocupada"
    })

    {:ok, reserva} = repo.insert(%Reserva{
      huesped_id: huesped.id,
      habitacion_id: habitacion.id,
      fecha_entrada: Date.add(Date.utc_today(), -2),
      fecha_salida: Date.utc_today(),
      estado: "checked_in",
      total: Decimal.new("200.00")
    })

    {:ok, _usuario} = repo.insert(%Usuario{
      nombre: "Limpieza CO",
      email: "limp_co_#{System.unique_integer([:positive])}@test.com",
      password_hash: Bcrypt.hash_pwd_salt("test123"),
      rol: "limpieza",
      activo: true
    })

    %{reserva: reserva, habitacion: habitacion}
  end

  describe "ejecutar/1" do
    test "checkout exitoso cambia habitación a en_limpieza", %{reserva: reserva} do
      assert {:ok, resultado} = CheckoutUseCase.ejecutar(reserva.id)
      assert resultado.habitacion.estado == "en_limpieza"
      assert resultado.reserva.estado == "checked_out"
      assert resultado.tarea_limpieza != nil
    end

    test "checkout fallido si reserva no está en checked_in", %{habitacion: habitacion} do
      repo = Hotelflux.Repo

      {:ok, reserva_conf} = repo.insert(%Reserva{
        huesped_id: Ecto.UUID.generate(),
        habitacion_id: habitacion.id,
        fecha_entrada: Date.utc_today(),
        fecha_salida: Date.add(Date.utc_today(), 1),
        estado: "confirmada",
        total: Decimal.new("100.00")
      })

      assert {:error, :estado_invalido} = CheckoutUseCase.ejecutar(reserva_conf.id)
    end
  end
end
