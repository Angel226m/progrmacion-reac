defmodule HotelFlux.Repo.Migrations.AddPrioridadToTareasLimpieza do
  use Ecto.Migration

  def change do
    alter table(:tareas_limpieza) do
      add :prioridad, :string, null: false, default: "normal"
    end

    create index(:tareas_limpieza, [:prioridad, :estado])
  end
end
