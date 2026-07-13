defmodule HotelFlux.Domain.HorarioPersonal do
  @moduledoc """
  Módulo de dominio para la entidad HorarioPersonal.
  Define el esquema de horarios asignados a empleados, con validaciones
  y funciones auxiliares para los días de la semana.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # Estados de asistencia posibles para un horario
  @estados_validos ~w(programado asistio falta permiso)
  # Mapa de número de día a nombre en español
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

  @doc """
  Cambioset de Ecto para validar atributos de un horario.
  Validaciones: empleado_id, turno_id y fecha requeridos; estado debe ser válido.
  Calcula automáticamente el día de la semana desde la fecha.
  """
  def changeset(horario, attrs) do
    horario
    |> cast(attrs, [:empleado_id, :turno_id, :fecha, :estado, :notas])
    |> validate_required([:empleado_id, :turno_id, :fecha])
    |> validate_inclusion(:estado, @estados_validos)
    |> calcula_dia_semana()
  end

  # Calcula el día de la semana (1=Lunes..7=Domingo) a partir del campo fecha
  defp calcula_dia_semana(changeset) do
    case get_change(changeset, :fecha) do
      nil -> changeset
      fecha -> put_change(changeset, :dia_semana, Date.day_of_week(fecha))
    end
  end

  @doc "Retorna el nombre del día en español dado su número (1=Lunes..7=Domingo). Función pura."
  def nombre_dia(dia_numero), do: Map.get(@dias_semana, dia_numero, "Desconocido")

  @doc "Retorna el mapa de días de la semana (número → nombre en español). Función pura."
  def dias_semana, do: @dias_semana

  @doc "Retorna la lista de estados válidos para un horario. Función pura."
  def estados_validos, do: @estados_validos
end
