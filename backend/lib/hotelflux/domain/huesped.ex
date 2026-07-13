defmodule HotelFlux.Domain.Huesped do
  @moduledoc """
  Entidad de dominio INMUTABLE — Huésped del hotel.
  """
  import Ecto.Changeset

  defstruct [
    :id,
    :nombre,
    :apellido,
    :email,
    :telefono,
    :documento,
    :tipo_documento,
    :nacionalidad,
    :eliminado,
    :eliminado_en,
    :inserted_at,
    :updated_at
  ]

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

  @doc "Nombre completo. Función pura."
  def nombre_completo(%__MODULE__{nombre: nombre, apellido: apellido}) do
    "#{nombre} #{apellido}"
  end
end
