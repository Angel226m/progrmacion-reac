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
    alter table(:turnos) do
      add :eliminado_en, :utc_datetime
    end

    alter table(:horarios_personal) do
      add :eliminado_en, :utc_datetime
    end
  end
end
