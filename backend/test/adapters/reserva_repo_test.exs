defmodule HotelFlux.Adapters.ReservaRepoTest do
  use HotelFlux.DataCase, async: false

  alias HotelFlux.Domain.{Habitacion, Huesped, Reserva}
  alias HotelFlux.Adapters.Repos.ReservaRepo

  setup do
    repo = HotelFlux.Repo

    {:ok, huesped} = repo.insert(%Huesped{
      nombre: "Test", apellido: "Repo",
      email: "repo_#{System.unique_integer([:positive])}@test.com"
    })

    {:ok, hab} = repo.insert(%Habitacion{
      numero: "RR#{System.unique_integer([:positive])}",
      tipo: "simple", piso: 1, capacidad: 1,
      precio_noche: Decimal.new("80.00"), estado: "disponible"
    })

    %{huesped: huesped, habitacion: hab}
  end

  describe "crear/1" do
    test "crea reserva con datos válidos", %{huesped: h, habitacion: hab} do
      attrs = %{
        huesped_id: h.id,
        habitacion_id: hab.id,
        fecha_entrada: Date.utc_today(),
        fecha_salida: Date.add(Date.utc_today(), 3),
        total: Decimal.new("240.00")
      }

      assert {:ok, reserva} = ReservaRepo.crear(attrs)
      assert reserva.estado == "confirmada"
    end
  end

  describe "actualizar_estado/2" do
    test "actualiza estado de la reserva", %{huesped: h, habitacion: hab} do
      {:ok, reserva} = Repo.insert(%Reserva{
        huesped_id: h.id, habitacion_id: hab.id,
        fecha_entrada: Date.utc_today(), fecha_salida: Date.add(Date.utc_today(), 1),
        estado: "confirmada"
      })

      assert {:ok, actualizada} = ReservaRepo.actualizar_estado(reserva.id, "checked_in")
      assert actualizada.estado == "checked_in"
    end
  end
end
