defmodule HotelFlux.Domain.TareaLimpiezaTest do
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.TareaLimpieza

  describe "nueva/2 — creación pura" do
    test "crea una nueva tarea con estado pendiente" do
      tarea = TareaLimpieza.nueva("hab-id-123", "emp-id-456")
      assert tarea.habitacion_id == "hab-id-123"
      assert tarea.empleado_id == "emp-id-456"
      assert tarea.estado == "pendiente"
      assert tarea.prioridad == "normal"
    end

    test "inmutabilidad: nueva/2 no afecta otras instancias" do
      t1 = TareaLimpieza.nueva("hab-1", "emp-1")
      t2 = TareaLimpieza.nueva("hab-2", "emp-2")
      assert t1.habitacion_id != t2.habitacion_id
    end
  end

  describe "pendiente?/1 — predicado puro" do
    test "retorna true si está pendiente" do
      assert TareaLimpieza.pendiente?(%TareaLimpieza{estado: "pendiente"})
    end

    test "retorna false si no está pendiente" do
      refute TareaLimpieza.pendiente?(%TareaLimpieza{estado: "en_proceso"})
    end

    test "retorna false para completada" do
      refute TareaLimpieza.pendiente?(%TareaLimpieza{estado: "completada"})
    end
  end

  describe "iniciar/1 — transición a en_proceso" do
    test "cambia estado a en_proceso" do
      tarea = TareaLimpieza.nueva("hab-1", "emp-1")
      changeset = TareaLimpieza.iniciar(tarea)
      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :estado) == "en_proceso"
    end

    test "establece iniciada_en" do
      tarea = TareaLimpieza.nueva("hab-1", "emp-1")
      changeset = TareaLimpieza.iniciar(tarea)
      assert Ecto.Changeset.get_change(changeset, :iniciada_en) != nil
    end

    test "inmutabilidad: iniciar no modifica el struct original" do
      tarea = TareaLimpieza.nueva("hab-1", "emp-1")
      TareaLimpieza.iniciar(tarea)
      assert tarea.estado == "pendiente"
    end
  end

  describe "completar/1 — transición a completada" do
    test "completa tarea que fue iniciada" do
      tarea = TareaLimpieza.nueva("hab-1", "emp-1")
      cs_iniciada = TareaLimpieza.iniciar(tarea)
      tarea_iniciada = Ecto.Changeset.apply_changes(cs_iniciada)
      cs_completada = TareaLimpieza.completar(tarea_iniciada)
      assert cs_completada.valid?
      assert Ecto.Changeset.get_change(cs_completada, :estado) == "completada"
    end

    test "completa tarea sin iniciar (duración 0)" do
      tarea = TareaLimpieza.nueva("hab-1", "emp-1")
      cs = TareaLimpieza.completar(tarea)
      assert cs.valid?
      assert Ecto.Changeset.get_change(cs, :duracion_minutos) == 0
    end

    test "establece completada_en" do
      tarea = TareaLimpieza.nueva("hab-1", "emp-1")
      cs = TareaLimpieza.completar(tarea)
      assert Ecto.Changeset.get_change(cs, :completada_en) != nil
    end
  end

  describe "changeset/2 — validaciones" do
    test "changeset válido con campos requeridos" do
      attrs = %{habitacion_id: "hab-1", empleado_id: "emp-1"}
      cs = TareaLimpieza.changeset(%TareaLimpieza{}, attrs)
      assert cs.valid?
    end

    test "changeset inválido sin habitacion_id" do
      attrs = %{empleado_id: "emp-1"}
      cs = TareaLimpieza.changeset(%TareaLimpieza{}, attrs)
      refute cs.valid?
      assert Keyword.has_key?(cs.errors, :habitacion_id)
    end

    test "changeset inválido sin empleado_id" do
      attrs = %{habitacion_id: "hab-1"}
      cs = TareaLimpieza.changeset(%TareaLimpieza{}, attrs)
      refute cs.valid?
      assert Keyword.has_key?(cs.errors, :empleado_id)
    end

    test "estado por defecto es pendiente" do
      assert %TareaLimpieza{}.estado == "pendiente"
    end

    test "prioridad por defecto es normal" do
      assert %TareaLimpieza{}.prioridad == "normal"
    end

    test "rechaza estado inválido" do
      attrs = %{habitacion_id: "hab-1", empleado_id: "emp-1", estado: "inventado"}
      cs = TareaLimpieza.changeset(%TareaLimpieza{}, attrs)
      refute cs.valid?
    end

    test "rechaza prioridad inválida" do
      attrs = %{habitacion_id: "hab-1", empleado_id: "emp-1", prioridad: "critica"}
      cs = TareaLimpieza.changeset(%TareaLimpieza{}, attrs)
      refute cs.valid?
    end

    test "acepta prioridades válidas — tabla-driven" do
      Enum.each(~w(baja normal alta urgente), fn prio ->
        attrs = %{habitacion_id: "hab-1", empleado_id: "emp-1", prioridad: prio}
        cs = TareaLimpieza.changeset(%TareaLimpieza{}, attrs)
        assert cs.valid?, "prioridad '#{prio}' debería ser válida"
      end)
    end
  end
end
