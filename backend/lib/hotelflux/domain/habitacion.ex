defmodule HotelFlux.Domain.Habitacion do
  @moduledoc """
  Entidad de dominio INMUTABLE — Habitación del hotel.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

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

  def novo(attrs \\ %{}) do
    struct(__MODULE__, Map.merge(%{estado: "disponible"}, attrs))
  end

  def changeset(habitacion, attrs) do
    habitacion
    |> cast(attrs, [:numero, :tipo, :piso, :capacidad, :precio_noche, :estado, :caracteristicas, :clasificacion])
    |> validate_required([:numero, :tipo, :piso, :capacidad, :precio_noche])
    |> validate_inclusion(:tipo, ~w(simple doble suite presidencial familiar individual))
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

  def validar_transicion(%__MODULE__{estado: estado_actual}, nuevo_estado) do
    transiciones = Transitions.tabla_habitacion()
    case Enum.find(transiciones, fn
           {_evento, desde, hasta} -> desde == estado_actual and hasta == nuevo_estado
         end) do
      {_evento, _desde, _hasta} -> {:ok, nuevo_estado}
      nil -> {:error, :transicion_invalida}
    end
  end

  def cambiar_estado(%__MODULE__{} = habitacion, nuevo_estado) do
    with {:ok, _} <- validar_transicion(habitacion, nuevo_estado) do
      {:ok, change(habitacion, estado: nuevo_estado)}
    end
  end

  def disponible?(%__MODULE__{estado: "disponible"}), do: true
  def disponible?(%__MODULE__{}), do: false

  def ocupada?(%__MODULE__{estado: "ocupada"}), do: true
  def ocupada?(%__MODULE__{}), do: false

  def estados_validos, do: @estados_validos

  def transiciones_validas, do: Transitions.tabla_habitacion()

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
  defp sumar_ingreso_potencial(acc, _hab), do: acc

  def calcular_estadisticas(habitaciones) do
    Enum.reduce(habitaciones, %{total: 0, por_estado: %{}, ingresos_potenciales: Decimal.new(0)}, fn hab, acc ->
      %{acc |
        total: acc.total + 1,
        por_estado: Map.update(acc.por_estado, hab.estado, 1, &(&1 + 1)),
        ingresos_potenciales: sumar_ingreso_potencial(acc.ingresos_potenciales, hab)}
    end)
  end
end
