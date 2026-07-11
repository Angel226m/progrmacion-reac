defmodule HotelFlux.Domain.Usuario do
  @moduledoc """
  Entidad de dominio — Usuario/Empleado del hotel.
  """

  @roles ~w(admin recepcionista gerente limpieza mantenimiento huesped)

  defstruct [
    :id,
    :nombre,
    :email,
    :password_hash,
    :password,
    :rol,
    :turno_id,
    activo: true,
    eliminado: false,
    :eliminado_en,
    :inserted_at,
    :updated_at
  ]

  @doc "Verifica contraseña. Función pura."
  def verify_password(%__MODULE__{password_hash: hash}, password) do
    Bcrypt.verify_pass(password, hash)
  end

  def roles_validos, do: @roles
end
