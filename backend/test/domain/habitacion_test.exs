defmodule HotelFlux.Domain.HabitacionTest do
  @moduledoc """
  Tests de la entidad Habitacion — funciones PURAS.
  Demuestra que las funciones de dominio son puras:
  - Mismo input → mismo output
  - Sin efectos secundarios
  - Transiciones de estado validadas funcionalmente
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.Habitacion

  describe "validar_transicion/2 — función pura de transiciones de estado" do
    test "disponible puede pasar a reservada" do
      hab = %Habitacion{estado: "disponible"}
      assert {:ok, "reservada"} = Habitacion.validar_transicion(hab, "reservada")
    end

    test "disponible puede pasar a en_mantenimiento" do
      hab = %Habitacion{estado: "disponible"}
      assert {:ok, "en_mantenimiento"} = Habitacion.validar_transicion(hab, "en_mantenimiento")
    end

    test "disponible NO puede pasar a ocupada directamente" do
      hab = %Habitacion{estado: "disponible"}
      assert {:error, :transicion_invalida} = Habitacion.validar_transicion(hab, "ocupada")
    end

    test "reservada puede pasar a ocupada (check-in)" do
      hab = %Habitacion{estado: "reservada"}
      assert {:ok, "ocupada"} = Habitacion.validar_transicion(hab, "ocupada")
    end

    test "ocupada puede pasar a en_limpieza (check-out)" do
      hab = %Habitacion{estado: "ocupada"}
      assert {:ok, "en_limpieza"} = Habitacion.validar_transicion(hab, "en_limpieza")
    end

    test "en_limpieza puede pasar a disponible (limpieza completada)" do
      hab = %Habitacion{estado: "en_limpieza"}
      assert {:ok, "disponible"} = Habitacion.validar_transicion(hab, "disponible")
    end

    test "checked_out NO puede pasar a reservada" do
      hab = %Habitacion{estado: "ocupada"}
      assert {:error, :transicion_invalida} = Habitacion.validar_transicion(hab, "reservada")
    end

    test "bloqueada solo puede pasar a disponible o mantenimiento" do
      hab = %Habitacion{estado: "bloqueada"}
      assert {:ok, "disponible"} = Habitacion.validar_transicion(hab, "disponible")
      assert {:ok, "en_mantenimiento"} = Habitacion.validar_transicion(hab, "en_mantenimiento")
      assert {:error, :transicion_invalida} = Habitacion.validar_transicion(hab, "ocupada")
    end
  end

  describe "disponible?/1 y ocupada?/1 — predicados puros" do
    test "disponible? retorna true si estado es disponible" do
      assert Habitacion.disponible?(%Habitacion{estado: "disponible"}) == true
    end

    test "disponible? retorna false si estado no es disponible" do
      assert Habitacion.disponible?(%Habitacion{estado: "ocupada"}) == false
    end

    test "ocupada? retorna true si estado es ocupada" do
      assert Habitacion.ocupada?(%Habitacion{estado: "ocupada"}) == true
    end
  end

  describe "changeset/2 — validaciones puras" do
    test "changeset válido con todos los campos requeridos" do
      attrs = %{
        numero: "101",
        tipo: "simple",
        piso: 1,
        capacidad: 2,
        precio_noche: Decimal.new("100.00")
      }

      changeset = Habitacion.changeset(%Habitacion{}, attrs)
      assert changeset.valid?
    end

    test "changeset inválido sin número" do
      attrs = %{tipo: "simple", piso: 1, capacidad: 2, precio_noche: Decimal.new("100.00")}
      changeset = Habitacion.changeset(%Habitacion{}, attrs)
      refute changeset.valid?
    end

    test "changeset inválido con tipo no reconocido" do
      attrs = %{numero: "101", tipo: "bunker", piso: 1, capacidad: 2, precio_noche: Decimal.new("100.00")}
      changeset = Habitacion.changeset(%Habitacion{}, attrs)
      refute changeset.valid?
    end

    test "changeset inválido con precio negativo" do
      attrs = %{numero: "101", tipo: "simple", piso: 1, capacidad: 2, precio_noche: Decimal.new("-50.00")}
      changeset = Habitacion.changeset(%Habitacion{}, attrs)
      refute changeset.valid?
    end
  end

  describe "cambiar_estado/2 — pipeline funcional puro" do
    test "retorna {:ok, changeset} para transición válida" do
      hab = %Habitacion{estado: "disponible"}
      assert {:ok, changeset} = Habitacion.cambiar_estado(hab, "reservada")
      assert Ecto.Changeset.get_change(changeset, :estado) == "reservada"
    end

    test "retorna {:error, :transicion_invalida} para transición inválida" do
      hab = %Habitacion{estado: "disponible"}
      assert {:error, :transicion_invalida} = Habitacion.cambiar_estado(hab, "ocupada")
    end
  end

  describe "inmutabilidad" do
    test "cambiar_estado no modifica el struct original" do
      original = %Habitacion{estado: "disponible", numero: "101"}
      Habitacion.cambiar_estado(original, "reservada")
      # El original NO cambia — inmutabilidad demostrada
      assert original.estado == "disponible"
    end
  end
end
