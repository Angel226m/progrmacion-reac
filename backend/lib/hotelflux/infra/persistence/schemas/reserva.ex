defmodule HotelFlux.Infra.Persistence.Schema.Reserva do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @estados_validos ~w(pendiente confirmada checked_in checked_out cancelada)

  schema "reservas" do
    field :fecha_entrada, :date
    field :fecha_salida, :date
    field :estado, :string, default: "confirmada"
    field :total, :decimal
    field :notas, :string

    belongs_to :huesped, HotelFlux.Infra.Persistence.Schema.Huesped
    belongs_to :habitacion, HotelFlux.Infra.Persistence.Schema.Habitacion
    has_many :consumos, HotelFlux.Infra.Persistence.Schema.Consumo
    has_many :pagos, HotelFlux.Infra.Persistence.Schema.Pago

    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(reserva, attrs) do
    reserva
    |> cast(attrs, [:huesped_id, :habitacion_id, :fecha_entrada, :fecha_salida, :estado, :total, :notas])
    |> validate_required([:huesped_id, :habitacion_id, :fecha_entrada, :fecha_salida])
    |> validate_inclusion(:estado, @estados_validos)
    |> validate_fechas()
    |> foreign_key_constraint(:huesped_id)
    |> foreign_key_constraint(:habitacion_id)
  end

  defp validate_fechas(changeset) do
    case {get_field(changeset, :fecha_entrada), get_field(changeset, :fecha_salida)} do
      {nil, _} -> changeset
      {_, nil} -> changeset
      {entrada, salida} ->
        case Date.compare(salida, entrada) do
          :gt -> changeset
          _ -> add_error(changeset, :fecha_salida, "debe ser posterior a la fecha de entrada")
        end
    end
  end
end
