defmodule HotelFlux.Domain.TareaLimpieza do
  @moduledoc """
  Entidad de dominio INMUTABLE — Tarea de limpieza asignada a una habitación.

  Cada tarea es un valor inmutable que fluye por los streams reactivos
  desde el backend hasta las tablets del personal de limpieza.
  Todas las operaciones retornan un nuevo struct sin mutar el original.
  """

  defstruct [
    :id,
    :habitacion_id,
    :habitacion,
    :empleado_id,
    :iniciada_en,
    :completada_en,
    :duracion_minutos,
    :notas,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    estado: "pendiente",   # Estado inicial por defecto
    prioridad: "normal",   # Prioridad por defecto
    eliminado: false       # Soft-delete por defecto
  ]

  @doc """
  Crea una nueva tarea pura — sin persistir ni efectos secundarios.
  Retorna un struct en estado "pendiente".
  """
  def nueva(habitacion_id, empleado_id) do
    %__MODULE__{
      habitacion_id: habitacion_id,
      empleado_id: empleado_id,
      estado: "pendiente"
    }
  end

  @doc """
  Inicia la tarea. Función pura: marca como "en_proceso" y registra timestamp.
  """
  def iniciar(tarea) do
    %{tarea | estado: "en_proceso", iniciada_en: DateTime.utc_now()}
  end

  @doc """
  Completa la tarea calculando la duración en minutos. Función pura.

  Si no se inició formalmente, duración = 0.
  """
  def completar(%__MODULE__{iniciada_en: nil} = tarea) do
    %{tarea | estado: "completada", completada_en: DateTime.utc_now(), duracion_minutos: 0}
  end

  # Calcula duración real si la tarea fue iniciada
  def completar(%__MODULE__{iniciada_en: inicio} = tarea) do
    ahora = DateTime.utc_now()
    duracion = DateTime.diff(ahora, inicio, :minute)

    %{tarea | estado: "completada", completada_en: ahora, duracion_minutos: duracion}
  end

  @doc "Verifica si la tarea está pendiente (no iniciada)."
  def pendiente?(%__MODULE__{estado: "pendiente"}), do: true
  def pendiente?(_), do: false

  @doc "Reporta un problema en la tarea. Función pura: cambia estado a 'con_problema'."
  def reportar_problema(tarea) do
    %{tarea | estado: "con_problema"}
  end

  @doc "Resuelve el problema y regresa la tarea a 'en_proceso'. Función pura."
  def resolver_problema(tarea) do
    %{tarea | estado: "en_proceso"}
  end

  @doc "Cancela la tarea. Función pura: cambia estado a 'cancelada'."
  def cancelar(tarea) do
    %{tarea | estado: "cancelada"}
  end
end
