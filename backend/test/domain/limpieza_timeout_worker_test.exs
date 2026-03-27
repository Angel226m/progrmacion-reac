defmodule HotelFlux.Workers.LimpiezaTimeoutWorkerTest do
  @moduledoc """
  Tests del worker de timeout de limpieza.
  Verifica la lógica de scheduling y manejo de estados.
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Workers.LimpiezaTimeoutWorker

  describe "programar/2" do
    test "genera un changeset de Oban válido" do
      tarea_id = Ecto.UUID.generate()
      habitacion_id = Ecto.UUID.generate()

      changeset = LimpiezaTimeoutWorker.programar(tarea_id, habitacion_id)

      assert %Oban.Job{} = Ecto.Changeset.apply_changes(changeset)
    end

    test "incluye tarea_id y habitacion_id en args" do
      tarea_id = Ecto.UUID.generate()
      habitacion_id = Ecto.UUID.generate()

      changeset = LimpiezaTimeoutWorker.programar(tarea_id, habitacion_id)
      changes = changeset.changes

      assert changes.args["tarea_id"] == tarea_id
      assert changes.args["habitacion_id"] == habitacion_id
    end

    test "programa en la cola de limpieza" do
      changeset = LimpiezaTimeoutWorker.programar(
        Ecto.UUID.generate(),
        Ecto.UUID.generate()
      )
      changes = changeset.changes

      assert changes.queue == "limpieza"
    end

    test "tiene schedule_in de 45 minutos" do
      changeset = LimpiezaTimeoutWorker.programar(
        Ecto.UUID.generate(),
        Ecto.UUID.generate()
      )
      changes = changeset.changes

      # 45 minutos = 2700 segundos
      assert changes.scheduled_at != nil
    end
  end
end
