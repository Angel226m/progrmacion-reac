defmodule HotelFlux.Domain.Habitacion do
  @moduledoc """
  Entidad de dominio INMUTABLE — Habitación del hotel.

  Todas las funciones son PURAS:
  - No modifican estado externo
  - Para el mismo input, siempre el mismo output
  - Devuelven datos nuevos, nunca mutan los existentes

  Demuestra: Inmutabilidad, funciones puras, pattern matching funcional.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # Estados válidos de una habitación
  @estados_validos ~w(disponible reservada ocupada en_limpieza en_mantenimiento bloqueada)
  @tipos_validos ~w(simple doble suite presidencial)

  # Transiciones de estado permitidas — Máquina de estados PURA (sin efectos secundarios)
  @transiciones_validas %{
    "disponible" => ["reservada", "en_mantenimiento", "bloqueada"],
    "reservada" => ["ocupada", "disponible", "bloqueada"],
    "ocupada" => ["en_limpieza", "en_mantenimiento"],
    "en_limpieza" => ["disponible", "en_mantenimiento"],
    "en_mantenimiento" => ["disponible", "bloqueada"],
    "bloqueada" => ["disponible", "en_mantenimiento"]
  }

  schema "habitaciones" do
    field :numero, :string
    field :tipo, :string
    field :piso, :integer
    field :capacidad, :integer
    field :precio_noche, :decimal
    field :estado, :string, default: "disponible"
    field :caracteristicas, :map
    field :clasificacion, :string    # VIP, estándar, económica, premium
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  @doc """
  Changeset de creación — valida todos los campos requeridos.
  Función pura: recibe struct + attrs, devuelve changeset sin efectos secundarios.
  """
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

  @doc """
  Valida si una transición de estado es permitida.
  FUNCIÓN PURA — no modifica nada, solo retorna {:ok, _} o {:error, _}

  ## Ejemplo
      iex> validar_transicion(%Habitacion{estado: "disponible"}, "reservada")
      {:ok, "reservada"}
      iex> validar_transicion(%Habitacion{estado: "disponible"}, "ocupada")
      {:error, :transicion_invalida}
  """
  def validar_transicion(%__MODULE__{estado: estado_actual}, nuevo_estado) do
    estados_destino = Map.get(@transiciones_validas, estado_actual, [])

    if nuevo_estado in estados_destino do
      {:ok, nuevo_estado}
    else
      {:error, :transicion_invalida}
    end
  end

  @doc """
  Cambia el estado de la habitación de forma funcional PURA.
  Retorna un nuevo changeset — no muta el struct original.

  Pipeline funcional:
    habitacion |> validar_transicion(nuevo_estado) |> aplicar_cambio()
  """
  def cambiar_estado(habitacion, nuevo_estado) do
    case validar_transicion(habitacion, nuevo_estado) do
      {:ok, estado_valido} ->
        changeset = changeset(habitacion, %{estado: estado_valido})
        {:ok, changeset}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc "Verifica si la habitación está disponible. Función pura predicado."
  def disponible?(%__MODULE__{estado: "disponible"}), do: true
  def disponible?(%__MODULE__{}), do: false

  @doc "Verifica si la habitación está ocupada. Función pura predicado."
  def ocupada?(%__MODULE__{estado: "ocupada"}), do: true
  def ocupada?(%__MODULE__{}), do: false

  @doc "Retorna los estados válidos como lista."
  def estados_validos, do: @estados_validos

  @doc "Retorna las transiciones válidas como mapa."
  def transiciones_validas, do: @transiciones_validas

  @doc "Changeset para soft delete — marca la habitación como eliminada."
  def soft_delete_changeset(habitacion) do
    habitacion
    |> cast(%{eliminado: true, eliminado_en: DateTime.utc_now()}, [:eliminado, :eliminado_en])
  end

  # ─────────────────────────────────────────────────────────────────
  # RECURSIÓN — Reconstrucción de estado por eventos (Event Sourcing)
  # ─────────────────────────────────────────────────────────────────

  @doc """
  Reconstruye el estado de una habitación aplicando una lista de eventos de dominio.
  FUNCIÓN RECURSIVA PURA (tail recursion) — sin efectos secundarios.

  Patrón Event Sourcing: estado_actual = fold(eventos, estado_inicial).
  Equivalente funcional de Enum.reduce/3, implementado con recursión explícita
  para demostrar el patrón fold recursivo.

  ## Ejemplo
      iex> reconstruir_desde_eventos(%Habitacion{estado: "disponible"}, [
      ...>   %{tipo: "estado_cambiado", payload: %{"estado" => "ocupada"}},
      ...>   %{tipo: "precio_actualizado", payload: %{"precio_noche" => "250.00"}}
      ...> ])
      %Habitacion{estado: "ocupada", precio_noche: Decimal.new("250.00")}
  """
  def reconstruir_desde_eventos(habitacion, []), do: habitacion

  def reconstruir_desde_eventos(habitacion, [evento | resto]) do
    nueva = aplicar_evento_dominio(habitacion, evento)
    # Recursión en cola — Elixir optimiza a iteración
    reconstruir_desde_eventos(nueva, resto)
  end

  # Aplica un evento de dominio al struct. Función pura — sin efectos secundarios.
  defp aplicar_evento_dominio(hab, %{tipo: "estado_cambiado", payload: %{"estado" => estado}}) do
    %{hab | estado: estado}
  end

  defp aplicar_evento_dominio(hab, %{tipo: "precio_actualizado", payload: %{"precio_noche" => precio}}) do
    %{hab | precio_noche: Decimal.new(precio)}
  end

  defp aplicar_evento_dominio(hab, _evento), do: hab

  # ─────────────────────────────────────────────────────────────────
  # FUNCIONES DE ORDEN SUPERIOR (Higher-Order Functions)
  # ─────────────────────────────────────────────────────────────────

  @doc """
  Agrupa habitaciones por piso usando recursión de cola.
  Construye un mapa %{piso => [habitaciones]} de forma funcional pura.

  RECURSIÓN + INMUTABILIDAD: cada paso crea un mapa nuevo, nunca muta.
  """
  def agrupar_por_piso(habitaciones) do
    agrupar_recursivo(habitaciones, %{})
  end

  defp agrupar_recursivo([], acumulador), do: acumulador

  defp agrupar_recursivo([hab | resto], acumulador) do
    actualizado = Map.update(acumulador, hab.piso, [hab], &[hab | &1])
    agrupar_recursivo(resto, actualizado)
  end

  @doc """
  Función que retorna una función — currying / closure funcional.
  Retorna un predicado de filtro para el estado dado.

  HIGHER-ORDER FUNCTION: retorna una función (closure captura `estado`).

  ## Ejemplo
      disponibles = Enum.filter(habitaciones, Habitacion.filtrar_por_estado("disponible"))
  """
  def filtrar_por_estado(estado) do
    fn %__MODULE__{estado: est} -> est == estado end
  end

  @doc """
  Aplica múltiples predicados a una lista de habitaciones.
  HIGHER-ORDER FUNCTION: recibe funciones como argumentos.

  ## Ejemplo
      Habitacion.filtrar_con(habitaciones, [
        Habitacion.filtrar_por_estado("disponible"),
        fn h -> h.capacidad >= 2 end
      ])
  """
  def filtrar_con(habitaciones, predicados) when is_list(predicados) do
    Enum.filter(habitaciones, fn hab ->
      Enum.all?(predicados, fn pred -> pred.(hab) end)
    end)
  end

  @doc """
  Calcula estadísticas de una lista de habitaciones.
  HOF + INMUTABILIDAD: usa Enum.reduce para construir resultado sin mutar.
  """
  def calcular_estadisticas(habitaciones) do
    Enum.reduce(habitaciones, %{total: 0, por_estado: %{}, ingresos_potenciales: Decimal.new(0)}, fn hab, acc ->
      nuevo_ingreso =
        if hab.estado == "disponible" do
          Decimal.add(acc.ingresos_potenciales, hab.precio_noche || Decimal.new(0))
        else
          acc.ingresos_potenciales
        end

      %{acc |
        total: acc.total + 1,
        por_estado: Map.update(acc.por_estado, hab.estado, 1, &(&1 + 1)),
        ingresos_potenciales: nuevo_ingreso}
    end)
  end
end
