defmodule HotelFlux.Repo.Migrations.AddEliminadoEnToTurnosAndHorarios do
  @moduledoc """
  Migración v6 — Agrega la columna `eliminado_en` faltante en tablas
  `turnos` y `horarios_personal`.

  Error 500: Los schemas `Turno` y `HorarioPersonal` definen el campo
  `eliminado_en` pero la migración original (v2) no lo incluyó al
  crear las tablas, causando un error de columna inexistente en Ecto.
  """
  use Ecto.Migration

  def change do
    execute """
    ALTER TABLE turnos
    ADD COLUMN IF NOT EXISTS eliminado_en timestamp
    """

    execute """
    ALTER TABLE horarios_personal
    ADD COLUMN IF NOT EXISTS eliminado_en timestamp
    """
  end
end
