defmodule HotelFlux.Domain.Huesped do
  @moduledoc """
  Entidad de dominio INMUTABLE — Huésped del hotel.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  schema "huespedes" do
    field :nombre, :string
    field :apellido, :string
    field :email, :string
    field :telefono, :string
    field :documento, :string
    field :tipo_documento, :string
    field :nacionalidad, :string
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  def changeset(huesped, attrs) do
    huesped
    |> cast(attrs, [:nombre, :apellido, :email, :telefono, :documento, :tipo_documento, :nacionalidad])
    |> validate_required([:nombre, :apellido])
    |> validate_change(:email, fn :email, value ->
      if is_binary(value) and value != "" and !String.match?(value, ~r/^[^\s]+@[^\s]+$/) do
        [email: "email inválido"]
      else
        []
      end
    end)
  end

  def nombre_completo(%__MODULE__{nombre: nombre, apellido: apellido}) do
    "#{nombre} #{apellido}"
  end
end
