defmodule HotelFlux.Domain.Turno do
  @moduledoc """
  Módulo de dominio para la entidad Turno (turno de trabajo del hotel).
  Define el esquema, validaciones y los turnos predefinidos (Mañana, Tarde, Noche).
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "turnos" do
    field :nombre, :string
    field :hora_inicio, :time
    field :hora_fin, :time
    field :activo, :boolean, default: true
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  @doc """
  Cambioset de Ecto para validar atributos de un turno.
  Validaciones: nombre y hora_inicio son requeridos.
  """
  def changeset(turno, attrs) do
    turno
    |> cast(attrs, [:nombre, :hora_inicio, :hora_fin, :activo])
    |> validate_required([:nombre, :hora_inicio])
  end

  @doc """
  Cambioset para borrado lógico (soft delete) de un turno.
  Marca eliminado=true y registra la fecha/hora actual.
  """
  def soft_delete_changeset(turno) do
    turno
    |> change()
    |> put_change(:eliminado, true)
    |> put_change(:eliminado_en, DateTime.utc_now())
  end

  @doc """
  Retorna los tres turnos predefinidos del hotel: Mañana, Tarde y Noche.
  Función pura — datos inmutables.
  """
  def turnos_predefinidos do
    [
      %{nombre: "Mañana", hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00]},
      %{nombre: "Tarde", hora_inicio: ~T[16:00:00], hora_fin: ~T[00:00:00]},
      %{nombre: "Noche", hora_inicio: ~T[00:00:00], hora_fin: ~T[08:00:00]}
    ]
  end
end
