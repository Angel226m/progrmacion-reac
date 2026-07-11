defmodule HotelFlux.Domain.Piso do
  @moduledoc """
  Entidad de dominio — Piso del hotel.
  Permite gestionar los pisos (crear, editar, eliminar con soft delete).
  Cada piso contiene múltiples habitaciones.
  """

  defstruct [
    :id,
    :numero,
    :nombre,
    :descripcion,
    activo: true,
    eliminado: false,
    :eliminado_en,
    :inserted_at,
    :updated_at
  ]
end
