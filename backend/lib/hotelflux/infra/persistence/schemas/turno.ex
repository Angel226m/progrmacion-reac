defmodule HotelFlux.Infra.Persistence.Schema.Turno do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "turnos" do
    field :nombre, :string
    field :hora_inicio, :time
    field :hora_fin, :time
    field :activo, :boolean, default: true
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    has_many :horarios, HotelFlux.Infra.Persistence.Schema.HorarioPersonal

    timestamps(type: :utc_datetime)
  end

  def changeset(turno, attrs) do
    turno
    |> cast(attrs, [:nombre, :hora_inicio, :hora_fin, :activo, :eliminado, :eliminado_en])
    |> validate_required([:nombre, :hora_inicio, :hora_fin])
  end

  def soft_delete_changeset(turno) do
    changeset(turno, %{eliminado: true, eliminado_en: DateTime.utc_now(), activo: false})
  end
end
