defmodule HotelFlux.Infra.Persistence.Schema.Evento do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "eventos_dominio" do
    field :tipo, :string
    field :agregado_id, :binary_id
    field :agregado_tipo, :string
    field :payload, :map
    field :ocurrido_en, :utc_datetime
  end

  def changeset(evento, attrs) do
    evento
    |> cast(attrs, [:tipo, :agregado_id, :agregado_tipo, :payload, :ocurrido_en])
    |> validate_required([:tipo, :agregado_id, :agregado_tipo, :payload])
    |> put_timestamp()
  end

  defp put_timestamp(changeset) do
    case get_field(changeset, :ocurrido_en) do
      nil -> put_change(changeset, :ocurrido_en, DateTime.utc_now())
      _ -> changeset
    end
  end
end
