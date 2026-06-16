defmodule HotelFlux.Domain.HorarioPersonal do
  @moduledoc """
  Entidad de dominio — Horario asignado a un empleado.
  Permite al administrador programar los días y turnos de cada empleado.
  Estados: programado, asistio, falta, permiso.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @estados_validos ~w(programado asistio falta permiso)
  @dias_semana %{1 => "Lunes", 2 => "Martes", 3 => "Miércoles", 4 => "Jueves",
                  5 => "Viernes", 6 => "Sábado", 7 => "Domingo"}

  schema "horarios_personal" do
    field :fecha, :date
    field :dia_semana, :integer
    field :estado, :string, default: "programado"
    field :notas, :string
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    belongs_to :empleado, HotelFlux.Domain.Usuario
    belongs_to :turno, HotelFlux.Domain.Turno

    timestamps(type: :utc_datetime)
  end

  @doc "Changeset para crear/actualizar un horario"
  def changeset(horario, attrs) do
    horario
    |> cast(attrs, [:empleado_id, :turno_id, :fecha, :dia_semana, :estado, :notas, :eliminado, :eliminado_en])
    |> validate_required([:empleado_id, :turno_id, :fecha])
    |> validate_inclusion(:estado, @estados_validos)
    |> validate_inclusion(:dia_semana, Map.keys(@dias_semana))
    |> calcular_dia_semana()
    |> foreign_key_constraint(:empleado_id)
    |> foreign_key_constraint(:turno_id)
    |> unique_constraint([:empleado_id, :fecha], name: :horarios_empleado_fecha_unico)
  end

  # Calcula automáticamente el día de la semana a partir de la fecha
  defp calcular_dia_semana(changeset) do
    case get_field(changeset, :fecha) do
      nil -> changeset
      fecha ->
        dia = Date.day_of_week(fecha)
        put_change(changeset, :dia_semana, dia)
    end
  end

  @doc "Marca el horario como eliminado (soft delete)"
  def soft_delete_changeset(horario) do
    changeset(horario, %{eliminado: true, eliminado_en: DateTime.utc_now()})
  end

  @doc "Retorna el nombre del día de la semana"
  def nombre_dia(dia_numero), do: Map.get(@dias_semana, dia_numero, "Desconocido")

  @doc "Días de la semana disponibles"
  def dias_semana, do: @dias_semana
end
