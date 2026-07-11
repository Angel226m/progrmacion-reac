defmodule HotelFlux.Domain.Huesped do
  @moduledoc """
  Entidad de dominio INMUTABLE — Huésped del hotel.
  """

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

  @doc "Nombre completo. Función pura."
  def nombre_completo(%__MODULE__{nombre: nombre, apellido: apellido}) do
    "#{nombre} #{apellido}"
  end
end
