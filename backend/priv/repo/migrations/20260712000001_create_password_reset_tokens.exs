defmodule HotelFlux.Repo.Migrations.CreatePasswordResetTokens do
  use Ecto.Migration

  def change do
    create table(:password_reset_tokens, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :usuario_id, references(:usuarios, type: :binary_id, on_delete: :delete_all), null: false
      add :token, :string, null: false
      add :expira_en, :utc_datetime, null: false
      add :usado, :boolean, default: false
      add :usado_en, :utc_datetime

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:password_reset_tokens, [:token])
    create index(:password_reset_tokens, [:usuario_id])
    create index(:password_reset_tokens, [:expira_en])
  end
end
