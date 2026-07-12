defmodule HotelFlux.Domain.TareaLimpieza do
  @moduledoc """
  Entidad de dominio INMUTABLE — Tarea de limpieza asignada.
  Cada tarea es un valor inmutable que fluye por los streams reactivos
  desde el backend hasta las tablets del personal de limpieza.
  """

  defstruct [
    :id,
    :habitacion_id,
    :empleado_id,
    :iniciada_en,
    :completada_en,
    :duracion_minutos,
    :notas,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    estado: "pendiente",
    prioridad: "normal",
    eliminado: false
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

  @doc "Reporta un problema en la tarea. FUNCIÓN PURA."
  def reportar_problema(tarea) do
    %{tarea | estado: "con_problema"}
  end

  @doc "Resuelve el problema y vuelve a en_proceso. FUNCIÓN PURA."
  def resolver_problema(tarea) do
    %{tarea | estado: "en_proceso"}
  end

  @doc "Cancela la tarea. FUNCIÓN PURA."
  def cancelar(tarea) do
    %{tarea | estado: "cancelada"}
  end
end
