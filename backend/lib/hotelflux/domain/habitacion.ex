defmodule HotelFlux.Domain.Habitacion do
  @moduledoc """
  Entidad de dominio INMUTABLE — Habitación del hotel.

  Principios FRP:
  - Inmutabilidad: todas las funciones retornan nuevos valores
  - Sin if/else: pattern matching + map dispatch
  - Higher-Order Functions (HOF): filter, reduce, closures
  - Recursión de cola para Event Sourcing
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @estados_validos ~w(disponible reservada ocupada en_limpieza en_mantenimiento bloqueada)
  @tipos_validos ~w(simple individual doble suite familiar presidencial)

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

  def changeset(habitacion, attrs) do
    habitacion
    |> cast(attrs, [:numero, :tipo, :piso, :capacidad, :precio_noche, :estado, :caracteristicas, :clasificacion, :eliminado, :eliminado_en])
    |> validate_required([:numero, :tipo, :piso, :capacidad, :precio_noche])
    |> validate_inclusion(:tipo, @tipos_validos)
    |> validate_inclusion(:estado, @estados_validos)
    |> validate_number(:piso, greater_than: 0)
    |> validate_number(:capacidad, greater_than: 0)
    |> validate_number(:precio_noche, greater_than: 0)
    |> unique_constraint(:numero)
  end

  alias HotelFlux.Domain.Transitions

  def validar_transicion(%__MODULE__{estado: estado_actual}, nuevo_estado) do
    case Enum.find(Transitions.tabla_habitacion(), fn
           {_evento, desde, hasta} -> desde == estado_actual and hasta == nuevo_estado
           _ -> false
         end) do
      {_evento, _desde, _hasta} -> {:ok, nuevo_estado}
      nil -> {:error, :transicion_invalida}
    end
  end

  def cambiar_estado(habitacion, nuevo_estado) do
    with {:ok, _estado} <- validar_transicion(habitacion, nuevo_estado) do
      changeset = changeset(habitacion, %{estado: nuevo_estado})
      {:ok, changeset}
    end
  end

  def disponible?(%__MODULE__{estado: "disponible"}), do: true
  def disponible?(%__MODULE__{}), do: false

  def ocupada?(%__MODULE__{estado: "ocupada"}), do: true
  def ocupada?(%__MODULE__{}), do: false

  def estados_validos, do: @estados_validos

  def transiciones_validas, do: Transitions.tabla_habitacion()

  def soft_delete_changeset(habitacion) do
    habitacion
    |> cast(%{eliminado: true, eliminado_en: DateTime.utc_now()}, [:eliminado, :eliminado_en])
  end

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

  def calcular_estadisticas(habitaciones) do
    Enum.reduce(habitaciones, %{total: 0, por_estado: %{}, ingresos_potenciales: Decimal.new(0)}, fn hab, acc ->
      ingreso_hab =
        %{"disponible" => fn -> Decimal.add(acc.ingresos_potenciales, hab.precio_noche || Decimal.new(0)) end}
        |> Map.get(hab.estado, fn -> acc.ingresos_potenciales end)
        |> then(fn f -> f.() end)

      %{acc |
        total: acc.total + 1,
        por_estado: Map.update(acc.por_estado, hab.estado, 1, &(&1 + 1)),
        ingresos_potenciales: ingreso_hab}
    end)
  end
end
