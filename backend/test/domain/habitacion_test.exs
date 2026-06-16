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

  describe "validar_transicion/2 — tabla de verdad completa (función pura)" do
    @transiciones_validas [
      {"disponible", "reservada"},
      {"disponible", "en_mantenimiento"},
      {"disponible", "bloqueada"},
      {"reservada", "ocupada"},
      {"reservada", "disponible"},
      {"reservada", "bloqueada"},
      {"ocupada", "en_limpieza"},
      {"ocupada", "en_mantenimiento"},
      {"en_limpieza", "disponible"},
      {"en_limpieza", "en_mantenimiento"},
      {"en_mantenimiento", "disponible"},
      {"en_mantenimiento", "bloqueada"},
      {"bloqueada", "disponible"},
      {"bloqueada", "en_mantenimiento"}
    ]

    @transiciones_invalidas [
      {"disponible", "ocupada"},
      {"disponible", "checked_out"},
      {"reservada", "en_limpieza"},
      {"reservada", "en_mantenimiento"},
      {"ocupada", "reservada"},
      {"ocupada", "disponible"},
      {"ocupada", "bloqueada"},
      {"en_limpieza", "reservada"},
      {"en_limpieza", "ocupada"},
      {"en_limpieza", "bloqueada"},
      {"en_mantenimiento", "reservada"},
      {"en_mantenimiento", "ocupada"},
      {"en_mantenimiento", "en_limpieza"},
      {"bloqueada", "reservada"},
      {"bloqueada", "ocupada"},
      {"bloqueada", "en_limpieza"},
      {"estado_inexistente", "disponible"}
    ]

    test "transiciones PERMITIDAS — tabla de verdad completa" do
      Enum.each(@transiciones_validas, fn {origen, destino} ->
        hab = %Habitacion{estado: origen}
        assert {:ok, ^destino} = Habitacion.validar_transicion(hab, destino),
               "Se esperaba {:ok, #{destino}} desde #{origen}"
      end)
    end

    test "transiciones DENEGADAS — tabla de verdad completa" do
      Enum.each(@transiciones_invalidas, fn {origen, destino} ->
        hab = %Habitacion{estado: origen}
        assert {:error, :transicion_invalida} = Habitacion.validar_transicion(hab, destino),
               "Se esperaba :transicion_invalida desde #{origen} → #{destino}"
      end)
    end

    test "inmutabilidad: el struct no cambia tras validar_transicion" do
      original = %Habitacion{estado: "disponible", numero: "101"}
      Habitacion.validar_transicion(original, "reservada")
      assert original.estado == "disponible"
    end

    test "composición pipeline: disponible → reservada → ocupada → en_limpieza → disponible" do
      estados = ["reservada", "ocupada", "en_limpieza", "disponible"]
      {_, aplicadas} =
        Enum.reduce(estados, {%Habitacion{estado: "disponible"}, []}, fn destino, {hab, acc} ->
          assert {:ok, ^destino} = Habitacion.validar_transicion(hab, destino)
          {%{hab | estado: destino}, acc ++ [destino]}
        end)
      assert aplicadas == estados
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
