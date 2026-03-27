defmodule HotelFlux.Domain.TareaLimpiezaTest do
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.TareaLimpieza

  describe "nueva/2 — creación pura" do
    test "crea una nueva tarea con estado pendiente" do
      tarea = TareaLimpieza.nueva("hab-id-123", "emp-id-456")
      assert tarea.habitacion_id == "hab-id-123"
      assert tarea.empleado_id == "emp-id-456"
      assert tarea.estado == "pendiente"
    end
  end

  describe "pendiente?/1 — predicado puro" do
    test "retorna true si está pendiente" do
      assert TareaLimpieza.pendiente?(%TareaLimpieza{estado: "pendiente"})
    end

    test "retorna false si no está pendiente" do
      refute TareaLimpieza.pendiente?(%TareaLimpieza{estado: "en_proceso"})
    end
  end
end
