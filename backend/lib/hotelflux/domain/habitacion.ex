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
end
