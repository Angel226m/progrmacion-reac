defmodule HotelFlux.Domain.Reserva do
  @moduledoc """
  Módulo de dominio para la entidad Reserva.
  Define el ciclo de vida completo de una reserva mediante una máquina de estados
  con transiciones: pendiente → confirmada → checked_in → checked_out.
  Todas las funciones son PURAS — sin efectos secundarios.
  """

  # Mapa de transiciones de estado: clave = estado actual, valor = lista de estados destino válidos
  @transiciones %{
    "pendiente" => ["confirmada", "cancelada"],
    "confirmada" => ["checked_in", "cancelada"],
    "checked_in" => ["checked_out"],
    "checked_out" => [],
    "cancelada" => []
  }

  # Struct de la reserva con estado inicial "confirmada" y eliminado en false
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
  Valida una transición de estado según la máquina de estados de la reserva.
  Función pura — retorna {:ok, nuevo_estado} o {:error, :transicion_invalida}.
  """
  def validar_transicion(%__MODULE__{estado: actual}, nuevo) do
    # Verifica si el nuevo estado está en la lista de estados permitidos desde el estado actual
    case nuevo in Map.get(@transiciones, actual, []) do
      true -> {:ok, nuevo}
      false -> {:error, :transicion_invalida}
    end
  end

  @doc """
  Calcula el número de noches entre la fecha de entrada y salida.
  Función pura — usa Date.diff/2.
  """
  def calcular_noches(%__MODULE__{fecha_entrada: entrada, fecha_salida: salida}) do
    Date.diff(salida, entrada)
  end

  @doc """
  Calcula el total a cobrar multiplicando el precio por noche por el número de noches.
  Función pura — recibe el struct reserva y el precio_noche, devuelve Decimal.
  """
  def calcular_total(reserva, precio_noche) do
    noches = calcular_noches(reserva)
    Decimal.mult(precio_noche, noches)
  end

  @doc "Verifica si la fecha de entrada de la reserva es hoy. Función pura — predicado."
  def es_para_hoy?(%__MODULE__{fecha_entrada: entrada}) do
    Date.compare(entrada, Date.utc_today()) == :eq
  end
end
