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
      ahora = DateTime.utc_now()

      changeset = LimpiezaTimeoutWorker.programar(
        Ecto.UUID.generate(),
        Ecto.UUID.generate()
      )
      changes = changeset.changes

      # 45 minutos ≈ 2700 segundos desde ahora
      assert changes.scheduled_at != nil
      diff = DateTime.diff(changes.scheduled_at, ahora, :second)
      assert diff >= 2680 and diff <= 2720,
             "schedule_at debería ser ~45 min en el futuro, pero es #{diff}s"
    end
  end
end
