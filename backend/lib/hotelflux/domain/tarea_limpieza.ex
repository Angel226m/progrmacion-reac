defmodule HotelFlux.Domain.TareaLimpieza do
  @moduledoc """
  Entidad de dominio INMUTABLE — Tarea de limpieza asignada.
  Cada tarea es un valor inmutable que fluye por los streams reactivos
  desde el backend hasta las tablets del personal de limpieza.
  """

  @estados ~w(pendiente en_proceso completada con_problema cancelada)
  @prioridades ~w(baja normal alta urgente)

  defstruct [
    :id,
    :habitacion_id,
    :empleado_id,
    estado: "pendiente",
    prioridad: "normal",
    :iniciada_en,
    :completada_en,
    :duracion_minutos,
    :notas,
    eliminado: false,
    :eliminado_en,
    :inserted_at,
    :updated_at
  ]

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
  Inicia la tarea. FUNCIÓN PURA.
  """
  def iniciar(tarea) do
    %{tarea | estado: "en_proceso", iniciada_en: DateTime.utc_now()}
  end

  @doc """
  Completa la tarea calculando duración. FUNCIÓN PURA.
  """
  def completar(%__MODULE__{iniciada_en: nil} = tarea) do
    %{tarea | estado: "completada", completada_en: DateTime.utc_now(), duracion_minutos: 0}
  end

  def completar(%__MODULE__{iniciada_en: inicio} = tarea) do
    ahora = DateTime.utc_now()
    duracion = DateTime.diff(ahora, inicio, :minute)

    %{tarea | estado: "completada", completada_en: ahora, duracion_minutos: duracion}
  end

  @doc "Verifica si está pendiente."
  def pendiente?(%__MODULE__{estado: "pendiente"}), do: true
  def pendiente?(_), do: false
end
