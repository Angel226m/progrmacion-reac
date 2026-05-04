defmodule Hotelflux.Adapters.HabitacionRepoTest do
  use Hotelflux.DataCase, async: false

  alias Hotelflux.Domain.Habitacion
  alias Hotelflux.Adapters.Repos.HabitacionRepo

  setup do
    repo = Hotelflux.Repo

    {:ok, hab} = repo.insert(%Habitacion{
      numero: "AR#{System.unique_integer([:positive])}",
      tipo: "doble", piso: 2, capacidad: 2,
      precio_noche: Decimal.new("120.00"), estado: "disponible"
    })

    %{habitacion: hab}
  end

  describe "obtener/1" do
    test "retorna habitación existente", %{habitacion: hab} do
      assert {:ok, encontrada} = HabitacionRepo.obtener(hab.id)
      assert encontrada.numero == hab.numero
    end

    test "retorna error para ID inexistente" do
      assert {:error, :not_found} = HabitacionRepo.obtener(Ecto.UUID.generate())
    end
  end

  describe "cambiar_estado/2" do
    test "cambia estado con transición válida", %{habitacion: hab} do
      assert {:ok, actualizada} = HabitacionRepo.cambiar_estado(hab.id, "reservada")
      assert actualizada.estado == "reservada"
    end

    test "rechaza transición inválida", %{habitacion: hab} do
      assert {:error, :transicion_invalida} = HabitacionRepo.cambiar_estado(hab.id, "ocupada")
    end
  end

  describe "contar_por_estado/0" do
    test "retorna mapa con conteo por estado" do
      conteo = HabitacionRepo.contar_por_estado()
      assert is_map(conteo)
    end
  end
end
