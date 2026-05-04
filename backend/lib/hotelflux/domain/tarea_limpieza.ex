defmodule HotelFlux.Domain.TareaLimpieza do
  @moduledoc """
  Entidad de dominio INMUTABLE — Tarea de limpieza asignada.
  Cada tarea es un valor inmutable que fluye por los streams reactivos
  desde el backend hasta las tablets del personal de limpieza.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @estados ~w(pendiente en_proceso completada)
  @prioridades ~w(baja normal alta urgente)

  schema "tareas_limpieza" do
    field :estado, :string, default: "pendiente"
    field :prioridad, :string, default: "normal"
    field :iniciada_en, :utc_datetime
    field :completada_en, :utc_datetime
    field :duracion_minutos, :integer
    field :notas, :string

    belongs_to :habitacion, HotelFlux.Domain.Habitacion
    belongs_to :empleado, HotelFlux.Domain.Usuario

    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(tarea, attrs) do
    tarea
    |> cast(attrs, [:habitacion_id, :empleado_id, :estado, :prioridad, :iniciada_en, :completada_en, :duracion_minutos, :notas])
    |> validate_required([:habitacion_id, :empleado_id])
    |> validate_inclusion(:estado, @estados)
    |> validate_inclusion(:prioridad, @prioridades)
    |> foreign_key_constraint(:habitacion_id)
    |> foreign_key_constraint(:empleado_id)
  end

  @doc """
  Crea una nueva tarea pura — sin persistir ni efectos secundarios.
  """
  def nueva(habitacion_id, empleado_id) do
    %__MODULE__{
      habitacion_id: habitacion_id,
      empleado_id: empleado_id,
      estado: "pendiente"
    }
  end

  @doc """
  Inicia la tarea. Retorna changeset nuevo — PURA.
  """
  def iniciar(tarea) do
    ahora = DateTime.utc_now()
    changeset(tarea, %{estado: "en_proceso", iniciada_en: ahora})
  end

  @doc """
  Completa la tarea calculando duración. FUNCIÓN PURA.
  """
  def completar(%__MODULE__{iniciada_en: nil} = tarea) do
    changeset(tarea, %{
      estado: "completada",
      completada_en: DateTime.utc_now(),
      duracion_minutos: 0
    })
  end

  def completar(%__MODULE__{iniciada_en: inicio} = tarea) do
    ahora = DateTime.utc_now()
    duracion = DateTime.diff(ahora, inicio, :minute)

    changeset(tarea, %{
      estado: "completada",
      completada_en: ahora,
      duracion_minutos: duracion
    })
  end

  @doc "Verifica si está pendiente."
  def pendiente?(%__MODULE__{estado: "pendiente"}), do: true
  def pendiente?(_), do: false
end
