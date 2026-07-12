defmodule HotelFlux.Infra.Persistence.Schema.TareaLimpieza do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @estados ~w(pendiente en_proceso completada con_problema cancelada)
  @prioridades ~w(baja normal alta urgente)

  schema "tareas_limpieza" do
    field :estado, :string, default: "pendiente"
    field :prioridad, :string, default: "normal"
    field :iniciada_en, :utc_datetime
    field :completada_en, :utc_datetime
    field :duracion_minutos, :integer
    field :notas, :string

    belongs_to :habitacion, HotelFlux.Infra.Persistence.Schema.Habitacion
    belongs_to :empleado, HotelFlux.Infra.Persistence.Schema.Usuario

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

  def iniciar(tarea) do
    ahora = DateTime.utc_now()
    changeset(tarea, %{estado: "en_proceso", iniciada_en: ahora})
  end

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
end
