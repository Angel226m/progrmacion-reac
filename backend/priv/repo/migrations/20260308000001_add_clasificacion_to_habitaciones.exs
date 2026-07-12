defmodule HotelFlux.Repo.Migrations.AddClasificacionToHabitaciones do
  use Ecto.Migration

  def up do
    execute "ALTER TABLE habitaciones ADD COLUMN IF NOT EXISTS clasificacion VARCHAR(255)",
            "ALTER TABLE habitaciones DROP COLUMN IF EXISTS clasificacion"

    execute "CREATE INDEX IF NOT EXISTS habitaciones_clasificacion_index ON habitaciones (clasificacion)",
            "DROP INDEX IF EXISTS habitaciones_clasificacion_index"
  end

  def down do
    execute "DROP INDEX IF EXISTS habitaciones_clasificacion_index"
    execute "ALTER TABLE habitaciones DROP COLUMN IF EXISTS clasificacion"
  end
end
