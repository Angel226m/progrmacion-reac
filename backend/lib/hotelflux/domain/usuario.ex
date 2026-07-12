defmodule HotelFlux.Domain.Usuario do
  @moduledoc """
  Entidad de dominio PURA — Usuario/Empleado del hotel.
  Sin dependencias de Ecto ni efectos secundarios.
  Las validaciones y hashing pertenecen a la capa de schemas/infra.
  """

  @roles ~w(admin recepcionista gerente limpieza mantenimiento huesped)

  defstruct [
    :id,
    :nombre,
    :email,
    :password_hash,
    :rol,
    :turno_id,
    :turno,
    :eliminado_en,
    :inserted_at,
    :updated_at,
    activo: true,
    eliminado: false
  ]

  @doc "Verifica contraseña contra el hash almacenado."
  def verify_password(%__MODULE__{password_hash: hash}, password) do
    Bcrypt.verify_pass(password, hash)
  end

  @doc "Lista de roles válidos del sistema."
  def roles_validos, do: @roles
end
