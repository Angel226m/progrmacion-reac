defmodule HotelFlux.Infra.Persistence.Schema.PasswordResetToken do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "password_reset_tokens" do
    field :usuario_id, :binary_id
    field :token, :string
    field :expira_en, :utc_datetime
    field :usado, :boolean, default: false
    field :usado_en, :utc_datetime

    timestamps(type: :utc_datetime, updated_at: false)
  end

  def changeset(schema, attrs) do
    schema
    |> cast(attrs, [:usuario_id, :token, :expira_en, :usado, :usado_en])
    |> validate_required([:usuario_id, :token, :expira_en])
    |> unique_constraint(:token)
  end

  def marcar_usado(schema) do
    change(schema, %{usado: true, usado_en: DateTime.utc_now()})
  end
end
