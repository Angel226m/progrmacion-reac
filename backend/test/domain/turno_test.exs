defmodule HotelFlux.Domain.TurnoTest do
  @moduledoc """
  Tests de la entidad Turno — turnos de trabajo del hotel.
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.Turno

  describe "changeset/2 — validaciones de turno" do
    test "changeset válido con turno mañana" do
      attrs = %{nombre: "Mañana", hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00], activo: true}
      changeset = Turno.changeset(%Turno{}, attrs)
      assert changeset.valid?
    end

    test "changeset válido con turno noche" do
      attrs = %{nombre: "Noche", hora_inicio: ~T[00:00:00], hora_fin: ~T[08:00:00]}
      changeset = Turno.changeset(%Turno{}, attrs)
      assert changeset.valid?
    end

    test "changeset inválido sin nombre" do
      attrs = %{hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00]}
      changeset = Turno.changeset(%Turno{}, attrs)
      refute changeset.valid?
    end

    test "changeset inválido sin hora_inicio" do
      attrs = %{nombre: "Test", hora_fin: ~T[16:00:00]}
      changeset = Turno.changeset(%Turno{}, attrs)
      refute changeset.valid?
    end

    test "soft delete changeset funciona" do
      turno = %Turno{id: "test-id", nombre: "Test", hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00]}
      changeset = Turno.soft_delete_changeset(turno)
      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :eliminado) == true
    end
  end
end
