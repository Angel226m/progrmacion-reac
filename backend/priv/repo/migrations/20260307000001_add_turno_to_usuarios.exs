defmodule HotelFlux.Repo.Migrations.AddTurnoToUsuarios do
  use Ecto.Migration

  def change do
    alter table(:usuarios) do
      add :turno_id, references(:turnos, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:usuarios, [:turno_id])
  end
end
