defmodule HotelFlux.Repo.Migrations.AddClasificacionToHabitaciones do
  use Ecto.Migration

  def change do
    alter table(:habitaciones) do
      add :clasificacion, :string
    end

    create index(:habitaciones, [:clasificacion])
  end
end
