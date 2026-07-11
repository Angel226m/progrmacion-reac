defmodule HotelFlux.Infra.Persistence.Schema.Habitacion do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @estados_validos ~w(disponible reservada ocupada en_limpieza en_mantenimiento bloqueada)
  @tipos_validos ~w(simple individual doble suite familiar presidencial)

  schema "habitaciones" do
    field :numero, :integer
    field :tipo, :string
    field :piso, :integer
    field :capacidad, :integer
    field :precio_noche, :decimal
    field :estado, :string, default: "disponible"
    field :caracteristicas, :string
    field :clasificacion, :string
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(habitacion, attrs) do
    habitacion
    |> cast(attrs, [:numero, :tipo, :piso, :capacidad, :precio_noche, :estado, :caracteristicas, :clasificacion])
    |> validate_required([:numero, :tipo, :precio_noche])
    |> validate_inclusion(:estado, @estados_validos)
    |> validate_inclusion(:tipo, @tipos_validos)
    |> validate_number(:numero, greater_than: 0)
    |> validate_number(:piso, greater_than: 0)
    |> validate_number(:capacidad, greater_than: 0)
    |> unique_constraint(:numero)
  end

  def soft_delete_changeset(habitacion) do
    changeset(habitacion, %{eliminado: true, eliminado_en: DateTime.utc_now()})
  end
end
