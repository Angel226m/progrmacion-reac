defmodule HotelFlux.Domain.Habitacion do
  @moduledoc """
  Módulo de dominio para la entidad Habitación.
  Define el esquema, cambioset, validaciones de transición de estados
  y consultas funcionales sobre colecciones de habitaciones.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # Lista de estados válidos que puede tener una habitación
  @estados_validos ~w(disponible reservada ocupada en_limpieza en_mantenimiento bloqueada)

  schema "habitaciones" do
    field :numero, :string
    field :tipo, :string
    field :piso, :integer
    field :capacidad, :integer
    field :precio_noche, :decimal
    field :estado, :string, default: "disponible"
    field :caracteristicas, :map
    field :clasificacion, :string
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  @doc """
  Construye un struct de Habitación con estado inicial "disponible".
  Función pura: recibe atributos, devuelve nuevo struct sin efectos secundarios.
  """
  def novo(attrs \\ %{}) do
    struct(__MODULE__, Map.merge(%{estado: "disponible"}, attrs))
  end

  @doc """
  Cambioset de Ecto para validar y filtrar atributos de una habitación.
  Validaciones: campos requeridos, tipo válido y precio_noche mayor a 0.
  """
  def changeset(habitacion, attrs) do
    habitacion
    |> cast(attrs, [:numero, :tipo, :piso, :capacidad, :precio_noche, :estado, :caracteristicas, :clasificacion])
    |> validate_required([:numero, :tipo, :piso, :capacidad, :precio_noche])
    |> validate_inclusion(:tipo, ~w(simple doble suite presidencial familiar individual))
    # Validación personalizada: precio_noche debe ser un número positivo o un Decimal mayor a 0
    |> validate_change(:precio_noche, fn :precio_noche, value ->
      cond do
        is_nil(value) -> []
        is_struct(value, Decimal) and Decimal.compare(value, Decimal.new("0")) == :gt -> []
        is_number(value) and value > 0 -> []
        true -> [precio_noche: "must be greater than 0"]
      end
    end)
  end

  alias HotelFlux.Domain.Transitions

  @doc """
  Valida si una transición de estado es permitida según la máquina de estados.
  Función pura: busca en la tabla de transiciones si existe la tupla (desde → hasta).
  Retorna {:ok, nuevo_estado} o {:error, :transicion_invalida}.
  """
  def validar_transicion(%__MODULE__{estado: estado_actual}, nuevo_estado) do
    transiciones = Transitions.tabla_habitacion()
    # Busca en la lista de tuplas {evento, desde, hasta} si la transición es válida
    case Enum.find(transiciones, fn
           {_evento, desde, hasta} -> desde == estado_actual and hasta == nuevo_estado
         end) do
      {_evento, _desde, _hasta} -> {:ok, nuevo_estado}
      nil -> {:error, :transicion_invalida}
    end
  end

  @doc """
  Cambia el estado de una habitación validando primero la transición.
  Función pura: retorna {:ok, changeset} o {:error, :transicion_invalida}.
  """
  def cambiar_estado(%__MODULE__{} = habitacion, nuevo_estado) do
    with {:ok, _} <- validar_transicion(habitacion, nuevo_estado) do
      {:ok, change(habitacion, estado: nuevo_estado)}
    end
  end

  @doc "Verifica si la habitación está disponible. Función pura — predicado."
  def disponible?(%__MODULE__{estado: "disponible"}), do: true
  def disponible?(%__MODULE__{}), do: false

  @doc "Verifica si la habitación está ocupada. Función pura — predicado."
  def ocupada?(%__MODULE__{estado: "ocupada"}), do: true
  def ocupada?(%__MODULE__{}), do: false

  @doc "Retorna la lista de estados válidos. Función pura."
  def estados_validos, do: @estados_validos

  @doc "Retorna la tabla de transiciones válidas desde Transitions. Función pura."
  def transiciones_validas, do: Transitions.tabla_habitacion()

  @doc """
  Reconstruye el estado actual de una habitación aplicando una lista de eventos de dominio en orden.
  Event Sourcing: función recursiva pura que pliega eventos sobre el struct.
  """
  def reconstruir_desde_eventos(habitacion, []), do: habitacion
  def reconstruir_desde_eventos(habitacion, [evento | resto]) do
    nueva = aplicar_evento_dominio(habitacion, evento)
    reconstruir_desde_eventos(nueva, resto)
  end

  # Aplica un evento individual al struct de la habitación
  defp aplicar_evento_dominio(hab, %{tipo: "estado_cambiado", payload: %{"estado" => estado}}) do
    %{hab | estado: estado}
  end
  defp aplicar_evento_dominio(hab, %{tipo: "precio_actualizado", payload: %{"precio_noche" => precio}}) do
    %{hab | precio_noche: Decimal.new(precio)}
  end
  # Evento desconocido: se ignora (tolerancia a eventos futuros)
  defp aplicar_evento_dominio(hab, _evento), do: hab

  @doc """
  Agrupa una lista de habitaciones por su número de piso.
  Función pura — retorna un mapa %{piso => [habitaciones]}.
  """
  def agrupar_por_piso(habitaciones) do
    agrupar_recursivo(habitaciones, %{})
  end

  # Función auxiliar recursiva de cola para agrupar por piso
  defp agrupar_recursivo([], acumulador), do: acumulador
  defp agrupar_recursivo([hab | resto], acumulador) do
    actualizado = Map.update(acumulador, hab.piso, [hab], &[hab | &1])
    agrupar_recursivo(resto, actualizado)
  end

  @doc """
  Retorna una función predicado que filtra habitaciones por estado.
  Útil para composición con `filtrar_con/2`. Función pura — HOF.
  """
  def filtrar_por_estado(estado) do
    fn %__MODULE__{estado: est} -> est == estado end
  end

  @doc """
  Filtra una lista de habitaciones aplicando múltiples predicados (AND lógico).
  Función pura — usa composición de predicados.
  """
  def filtrar_con(habitaciones, predicados) when is_list(predicados) do
    Enum.filter(habitaciones, fn hab ->
      Enum.all?(predicados, fn pred -> pred.(hab) end)
    end)
  end

  # Suma el precio_noche solo si la habitación está disponible (ingreso potencial)
  defp sumar_ingreso_potencial(acc, %__MODULE__{estado: "disponible", precio_noche: p}),
    do: Decimal.add(acc, p || Decimal.new(0))
  defp sumar_ingreso_potencial(acc, _hab), do: acc

  @doc """
  Calcula estadísticas de una lista de habitaciones: total, conteo por estado e ingresos potenciales.
  Función pura — reduce la colección a un resumen.
  """
  def calcular_estadisticas(habitaciones) do
    Enum.reduce(habitaciones, %{total: 0, por_estado: %{}, ingresos_potenciales: Decimal.new(0)}, fn hab, acc ->
      %{acc |
        total: acc.total + 1,
        por_estado: Map.update(acc.por_estado, hab.estado, 1, &(&1 + 1)),
        ingresos_potenciales: sumar_ingreso_potencial(acc.ingresos_potenciales, hab)}
    end)
  end
end
