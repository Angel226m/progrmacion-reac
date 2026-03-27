defmodule HotelFlux.Domain.Evento do
  @moduledoc """
  Entidad base de EVENT SOURCING — Evento de dominio INMUTABLE.

  Cada evento es un registro inmutable que captura un hecho que ocurrió
  en el dominio. Los eventos son la FUENTE DE VERDAD del sistema.

  Nunca se modifican ni eliminan — solo se agregan nuevos eventos.
  """
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

  @doc """
  Crea un nuevo evento de dominio. FUNCIÓN PURA — no persiste, solo crea el struct.
  """
  def nuevo(tipo, agregado_id, agregado_tipo, payload) do
    %__MODULE__{
      tipo: tipo,
      agregado_id: agregado_id,
      agregado_tipo: agregado_tipo,
      payload: payload,
      ocurrido_en: DateTime.utc_now()
    }
  end

  defp put_timestamp(changeset) do
    case get_field(changeset, :ocurrido_en) do
      nil -> put_change(changeset, :ocurrido_en, DateTime.utc_now())
      _ -> changeset
    end
  end
end
