defmodule HotelFlux.Domain.SoftDeleteTest do
  @moduledoc """
  Tests del patrón Soft Delete — verifica que TODAS las entidades lo soportan.
  Regla: Ningún dato se borra físicamente del sistema.
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.{
    Usuario, Habitacion, Reserva, Producto,
    Huesped, Consumo, Pago, TareaLimpieza,
    Piso, Turno, HorarioPersonal
  }

  alias HotelFlux.Infra.Persistence.Schema, as: Schema

  describe "Soft delete en todas las entidades" do
    test "todas las entidades tienen campo :eliminado" do
      entidades = [
        Usuario, Habitacion, Reserva, Producto,
        Huesped, Consumo, Pago, TareaLimpieza,
        Piso, Turno, HorarioPersonal
      ]

      Enum.each(entidades, fn modulo ->
        fields = modulo.__struct__() |> Map.from_struct() |> Map.keys()
        assert :eliminado in fields,
          "#{inspect(modulo)} NO tiene campo :eliminado"
      end)
    end

    test "todas las entidades tienen campo :eliminado_en" do
      entidades = [
        Usuario, Habitacion, Reserva, Producto,
        Huesped, Consumo, Pago, TareaLimpieza,
        Piso, Turno, HorarioPersonal
      ]

      Enum.each(entidades, fn modulo ->
        fields = modulo.__struct__() |> Map.from_struct() |> Map.keys()
        assert :eliminado_en in fields,
          "#{inspect(modulo)} NO tiene campo :eliminado_en"
      end)
    end

    test "Piso tiene soft_delete_changeset" do
      piso = %Schema.Piso{id: "t", numero: 1, nombre: "T", eliminado: false}
      cs = Schema.Piso.soft_delete_changeset(piso)
      assert Ecto.Changeset.get_change(cs, :eliminado) == true
      assert Ecto.Changeset.get_change(cs, :eliminado_en) != nil
    end

    test "Turno tiene soft_delete_changeset" do
      turno = %Schema.Turno{id: "t", nombre: "T", hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00], eliminado: false}
      cs = Schema.Turno.soft_delete_changeset(turno)
      assert Ecto.Changeset.get_change(cs, :eliminado) == true
    end

    test "HorarioPersonal tiene soft_delete_changeset" do
      h = %Schema.HorarioPersonal{id: "t", empleado_id: "e", turno_id: "t", fecha: ~D[2025-01-01], eliminado: false}
      cs = Schema.HorarioPersonal.soft_delete_changeset(h)
      assert Ecto.Changeset.get_change(cs, :eliminado) == true
    end

    test "Usuario tiene soft_delete_changeset" do
      u = %Schema.Usuario{id: "t", nombre: "T", email: "t@e", password_hash: "h", rol: "admin", eliminado: false}
      cs = Schema.Usuario.soft_delete_changeset(u)
      assert Ecto.Changeset.get_change(cs, :eliminado) == true
    end

    test "Habitacion tiene soft_delete_changeset" do
      h = %Schema.Habitacion{id: "t", numero: "101", tipo: "simple", piso: 1, capacidad: 1,
                              precio_noche: Decimal.new("100"), eliminado: false}
      cs = Schema.Habitacion.soft_delete_changeset(h)
      assert Ecto.Changeset.get_change(cs, :eliminado) == true
    end
  end
end
