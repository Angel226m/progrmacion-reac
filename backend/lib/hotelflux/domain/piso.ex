defmodule HotelFlux.Domain.Piso do
  @moduledoc """
  Módulo de dominio para la entidad Piso.
  Define el esquema de los pisos del hotel con validaciones básicas
  y soporte para borrado lógico.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "pisos" do
    field :numero, :integer
    field :nombre, :string
    field :descripcion, :string
    field :activo, :boolean, default: true
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  @doc """
  Cambioset de Ecto para validar atributos de un piso.
  Validaciones: número y nombre son requeridos.
  """
  def changeset(piso, attrs) do
    piso
    |> cast(attrs, [:numero, :nombre, :descripcion, :activo])
    |> validate_required([:numero, :nombre])
  end

  @doc """
  Cambioset para borrado lógico (soft delete) de un piso.
  Marca eliminado=true y registra la fecha/hora actual.
  """
  def soft_delete_changeset(piso) do
    piso
    |> change()
    |> put_change(:eliminado, true)
    |> put_change(:eliminado_en, DateTime.utc_now())
  end
end
