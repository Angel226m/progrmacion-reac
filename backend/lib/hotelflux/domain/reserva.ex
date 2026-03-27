defmodule HotelFlux.Domain.Reserva do
  @moduledoc """
  Entidad de dominio INMUTABLE — Reserva del hotel.

  Representa una reserva con su ciclo de vida completo.
  Todas las funciones son PURAS — sin efectos secundarios.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @estados_validos ~w(confirmada checked_in checked_out cancelada)

  @transiciones %{
    "confirmada" => ["checked_in", "cancelada"],
    "checked_in" => ["checked_out"],
    "checked_out" => [],
    "cancelada" => []
  }

  schema "reservas" do
    field :fecha_entrada, :date
    field :fecha_salida, :date
    field :estado, :string, default: "confirmada"
    field :total, :decimal
    field :notas, :string

    belongs_to :huesped, HotelFlux.Domain.Huesped
    belongs_to :habitacion, HotelFlux.Domain.Habitacion
    has_many :consumos, HotelFlux.Domain.Consumo
    has_many :pagos, HotelFlux.Domain.Pago

    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(reserva, attrs) do
    reserva
    |> cast(attrs, [:huesped_id, :habitacion_id, :fecha_entrada, :fecha_salida, :estado, :total, :notas])
    |> validate_required([:huesped_id, :habitacion_id, :fecha_entrada, :fecha_salida])
    |> validate_inclusion(:estado, @estados_validos)
    |> validate_fechas()
    |> foreign_key_constraint(:huesped_id)
    |> foreign_key_constraint(:habitacion_id)
  end

  @doc """
  Valida transición de estado. FUNCIÓN PURA.
  """
  def validar_transicion(%__MODULE__{estado: actual}, nuevo) do
    destinos = Map.get(@transiciones, actual, [])
    if nuevo in destinos, do: {:ok, nuevo}, else: {:error, :transicion_invalida}
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

  # Validación pura: fecha_salida debe ser posterior a fecha_entrada
  defp validate_fechas(changeset) do
    entrada = get_field(changeset, :fecha_entrada)
    salida = get_field(changeset, :fecha_salida)

    if entrada && salida && Date.compare(salida, entrada) != :gt do
      add_error(changeset, :fecha_salida, "debe ser posterior a la fecha de entrada")
    else
      changeset
    end
  end
end
