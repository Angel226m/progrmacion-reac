defmodule HotelFlux.Domain.Reserva do
  @moduledoc """
  Entidad de dominio INMUTABLE — Reserva del hotel.

  Representa una reserva con su ciclo de vida completo.
  Todas las funciones son PURAS — sin efectos secundarios.
  """

  @transiciones %{
    "pendiente" => ["confirmada", "cancelada"],
    "confirmada" => ["checked_in", "cancelada"],
    "checked_in" => ["checked_out"],
    "checked_out" => [],
    "cancelada" => []
  }

  defstruct [
    :id,
    :huesped_id,
    :habitacion_id,
    :huesped,
    :habitacion,
    :fecha_entrada,
    :fecha_salida,
    :total,
    :notas,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    estado: "confirmada",
    eliminado: false
  ]

  @doc """
  Valida transición de estado. FUNCIÓN PURA.
  """
  def validar_transicion(%__MODULE__{estado: actual}, nuevo) do
    case nuevo in Map.get(@transiciones, actual, []) do
      true -> {:ok, nuevo}
      false -> {:error, :transicion_invalida}
    end
  end

  @doc """
  Calcula el total de noches. FUNCIÓN PURA.
  """
  def calcular_noches(%__MODULE__{fecha_entrada: entrada, fecha_salida: salida}) do
    Date.diff(salida, entrada)
  end

  @doc """
  Calcula el total a cobrar. FUNCIÓN PURA — recibe precio, devuelve total.
  """
  def calcular_total(reserva, precio_noche) do
    noches = calcular_noches(reserva)
    Decimal.mult(precio_noche, noches)
  end

  @doc "Verifica si la reserva es para hoy. Función pura."
  def es_para_hoy?(%__MODULE__{fecha_entrada: entrada}) do
    Date.compare(entrada, Date.utc_today()) == :eq
  end
end
