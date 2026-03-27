defmodule HotelFlux.Domain.PisoTest do
  @moduledoc """
  Tests de la entidad Piso — funciones puras de validación.
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.Piso

  describe "changeset/2 — validaciones de piso" do
    test "changeset válido con todos los campos" do
      attrs = %{numero: 1, nombre: "Planta Baja", descripcion: "Primer piso", activo: true}
      changeset = Piso.changeset(%Piso{}, attrs)
      assert changeset.valid?
    end

    test "changeset inválido sin numero" do
      attrs = %{nombre: "Planta Baja"}
      changeset = Piso.changeset(%Piso{}, attrs)
      refute changeset.valid?
      assert %{numero: _} = errors_on(changeset)
    end

    test "changeset inválido sin nombre" do
      attrs = %{numero: 1}
      changeset = Piso.changeset(%Piso{}, attrs)
      refute changeset.valid?
      assert %{nombre: _} = errors_on(changeset)
    end

    test "soft delete changeset marca eliminado" do
      piso = %Piso{id: "test-id", numero: 1, nombre: "Test", eliminado: false}
      changeset = Piso.soft_delete_changeset(piso)
      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :eliminado) == true
    end
  end

  defp errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, _opts} -> msg end)
  end
end
