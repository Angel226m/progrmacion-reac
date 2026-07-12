defmodule HotelFlux.Domain.Habitacion do
  @moduledoc """
  Entidad de dominio INMUTABLE — Habitación del hotel.

  Principios FRP:
  - Inmutabilidad: todas las funciones retornan nuevos valores
  - Sin if/else: pattern matching + map dispatch
  - Higher-Order Functions (HOF): filter, reduce, closures
  - Recursión de cola para Event Sourcing
  """

  @estados_validos ~w(disponible reservada ocupada en_limpieza en_mantenimiento bloqueada)

  defstruct [:id, :numero, :tipo, :piso, :capacidad, :precio_noche, :estado,
    :caracteristicas, :clasificacion, :eliminado, :eliminado_en, :inserted_at, :updated_at]

  def novo(attrs \\ %{}) do
    struct(__MODULE__, Map.merge(%{estado: "disponible"}, attrs))
  end

  alias HotelFlux.Domain.Transitions

  def validar_transicion(%__MODULE__{estado: estado_actual}, nuevo_estado) do
    transiciones = Transitions.tabla_habitacion()
    case Enum.find_value(transiciones, fn
           {_evento, desde, hasta} when desde == estado_actual and hasta == nuevo_estado -> {:ok, nuevo_estado}
           _ -> false
         end) do
      {:ok, _} = ok -> ok
      false -> {:error, :transicion_invalida}
    end
  end

  def cambiar_estado(%__MODULE__{} = habitacion, nuevo_estado) do
    with {:ok, _} <- validar_transicion(habitacion, nuevo_estado) do
      {:ok, %{habitacion | estado: nuevo_estado}}
    end
  end

  def disponible?(%__MODULE__{estado: "disponible"}), do: true
  def disponible?(%__MODULE__{}), do: false

  def ocupada?(%__MODULE__{estado: "ocupada"}), do: true
  def ocupada?(%__MODULE__{}), do: false

  def estados_validos, do: @estados_validos

  def transiciones_validas, do: Transitions.tabla_habitacion()

  # ── Event Sourcing: reconstrucción recursiva de estado ──

  def reconstruir_desde_eventos(habitacion, []), do: habitacion

  def reconstruir_desde_eventos(habitacion, [evento | resto]) do
    nueva = aplicar_evento_dominio(habitacion, evento)
    reconstruir_desde_eventos(nueva, resto)
  end

  defp aplicar_evento_dominio(hab, %{tipo: "estado_cambiado", payload: %{"estado" => estado}}) do
    %{hab | estado: estado}
  end

  defp aplicar_evento_dominio(hab, %{tipo: "precio_actualizado", payload: %{"precio_noche" => precio}}) do
    %{hab | precio_noche: Decimal.new(precio)}
  end

  defp aplicar_evento_dominio(hab, _evento), do: hab

  # ── Higher-Order Functions ──

  def agrupar_por_piso(habitaciones) do
    agrupar_recursivo(habitaciones, %{})
  end

  defp agrupar_recursivo([], acumulador), do: acumulador

  defp agrupar_recursivo([hab | resto], acumulador) do
    actualizado = Map.update(acumulador, hab.piso, [hab], &[hab | &1])
    agrupar_recursivo(resto, actualizado)
  end

  def filtrar_por_estado(estado) do
    fn %__MODULE__{estado: est} -> est == estado end
  end

  def filtrar_con(habitaciones, predicados) when is_list(predicados) do
    Enum.filter(habitaciones, fn hab ->
      Enum.all?(predicados, fn pred -> pred.(hab) end)
    end)
  end

  defp sumar_ingreso_potencial(acc, %__MODULE__{estado: "disponible", precio_noche: p}),
    do: Decimal.add(acc, p || Decimal.new(0))
  defp sumar_ingreso_potencial(acc, _hab),
    do: acc

  def calcular_estadisticas(habitaciones) do
    Enum.reduce(habitaciones, %{total: 0, por_estado: %{}, ingresos_potenciales: Decimal.new(0)}, fn hab, acc ->
      %{acc |
        total: acc.total + 1,
        por_estado: Map.update(acc.por_estado, hab.estado, 1, &(&1 + 1)),
        ingresos_potenciales: sumar_ingreso_potencial(acc.ingresos_potenciales, hab)}
    end)
  end
end
