defmodule HotelFlux.Domain.Huesped do
  @moduledoc """
  Módulo de dominio para la entidad Huésped.
  Define el esquema, validaciones de datos personales
  y funciones de proyección sobre la información del huésped.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
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

  @doc """
  Cambioset de Ecto para validar datos del huésped.
  Validaciones: nombre y apellido requeridos; email con formato básico.
  """
  def changeset(huesped, attrs) do
    huesped
    |> cast(attrs, [:nombre, :apellido, :email, :telefono, :documento, :tipo_documento, :nacionalidad])
    |> validate_required([:nombre, :apellido])
    # Validación de formato de email usando una expresión regular básica
    |> validate_change(:email, fn :email, value ->
      if is_binary(value) and value != "" and !String.match?(value, ~r/^[^\s]+@[^\s]+$/) do
        [email: "email inválido"]
      else
        []
      end
    end)
  end

  @doc """
  Retorna el nombre completo del huésped como "Nombre Apellido".
  Función pura — proyección del struct.
  """
  def nombre_completo(%__MODULE__{nombre: nombre, apellido: apellido}) do
    "#{nombre} #{apellido}"
  end
end
