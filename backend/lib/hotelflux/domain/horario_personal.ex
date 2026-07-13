defmodule HotelFlux.Domain.HorarioPersonal do
  @moduledoc """
  Entidad de dominio — Horario asignado a un empleado.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  @estados_validos ~w(programado asistio falta permiso)
  @dias_semana %{1 => "Lunes", 2 => "Martes", 3 => "Miércoles", 4 => "Jueves",
                  5 => "Viernes", 6 => "Sábado", 7 => "Domingo"}

  schema "horarios_personal" do
    field :empleado_id, :binary_id
    field :turno_id, :binary_id
    field :fecha, :date
    field :dia_semana, :integer
    field :estado, :string, default: "programado"
    field :notas, :string
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  def changeset(horario, attrs) do
    horario
    |> cast(attrs, [:empleado_id, :turno_id, :fecha, :estado, :notas])
    |> validate_required([:empleado_id, :turno_id, :fecha])
    |> validate_inclusion(:estado, @estados_validos)
    |> calcula_dia_semana()
  end

  defp calcula_dia_semana(changeset) do
    case get_change(changeset, :fecha) do
      nil -> changeset
      fecha -> put_change(changeset, :dia_semana, Date.day_of_week(fecha))
    end
  end

  def nombre_dia(dia_numero), do: Map.get(@dias_semana, dia_numero, "Desconocido")
  def dias_semana, do: @dias_semana
  def estados_validos, do: @estados_validos
end
