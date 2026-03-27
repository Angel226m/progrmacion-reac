defmodule HotelFlux.Domain.HorarioPersonalTest do
  @moduledoc """
  Tests de la entidad HorarioPersonal — asignación de horarios.
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.HorarioPersonal

  describe "changeset/2 — validaciones de horario" do
    test "changeset válido con todos los campos" do
      attrs = %{
        empleado_id: Ecto.UUID.generate(),
        turno_id: Ecto.UUID.generate(),
        fecha: ~D[2025-03-15],
        estado: "programado"
      }
      changeset = HorarioPersonal.changeset(%HorarioPersonal{}, attrs)
      assert changeset.valid?
    end

    test "calcula día de la semana automáticamente" do
      # 15 de marzo 2025 es sábado (6)
      attrs = %{
        empleado_id: Ecto.UUID.generate(),
        turno_id: Ecto.UUID.generate(),
        fecha: ~D[2025-03-15],
        estado: "programado"
      }
      changeset = HorarioPersonal.changeset(%HorarioPersonal{}, attrs)
      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :dia_semana) == 6
    end

    test "changeset inválido sin empleado_id" do
      attrs = %{turno_id: Ecto.UUID.generate(), fecha: ~D[2025-03-15]}
      changeset = HorarioPersonal.changeset(%HorarioPersonal{}, attrs)
      refute changeset.valid?
    end

    test "changeset inválido sin turno_id" do
      attrs = %{empleado_id: Ecto.UUID.generate(), fecha: ~D[2025-03-15]}
      changeset = HorarioPersonal.changeset(%HorarioPersonal{}, attrs)
      refute changeset.valid?
    end

    test "estado válido — programado" do
      attrs = base_attrs() |> Map.put(:estado, "programado")
      changeset = HorarioPersonal.changeset(%HorarioPersonal{}, attrs)
      assert changeset.valid?
    end

    test "estado válido — asistio" do
      attrs = base_attrs() |> Map.put(:estado, "asistio")
      changeset = HorarioPersonal.changeset(%HorarioPersonal{}, attrs)
      assert changeset.valid?
    end

    test "estado válido — falta" do
      attrs = base_attrs() |> Map.put(:estado, "falta")
      changeset = HorarioPersonal.changeset(%HorarioPersonal{}, attrs)
      assert changeset.valid?
    end

    test "estado inválido rechazado" do
      attrs = base_attrs() |> Map.put(:estado, "vacaciones")
      changeset = HorarioPersonal.changeset(%HorarioPersonal{}, attrs)
      refute changeset.valid?
    end
  end

  defp base_attrs do
    %{
      empleado_id: Ecto.UUID.generate(),
      turno_id: Ecto.UUID.generate(),
      fecha: ~D[2025-03-15],
      estado: "programado"
    }
  end
end
