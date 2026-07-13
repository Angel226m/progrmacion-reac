defmodule HotelFlux.Domain.Usuario do
  @moduledoc """
  Módulo de dominio para la entidad Usuario (empleado del hotel).
  Define el esquema, roles del sistema y verificación de contraseñas.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # Roles del sistema: determina los permisos de cada usuario
  @roles ~w(admin recepcionista gerente limpieza mantenimiento huesped)

  schema "usuarios" do
    field :nombre, :string
    field :email, :string
    field :password_hash, :string
    field :rol, :string
    field :turno_id, :binary_id
    field :activo, :boolean, default: true
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  @doc """
  Verifica si la contraseña en texto plano coincide con el hash almacenado.
  Usa Bcrypt. Función pura — retorna boolean.
  """
  def verify_password(%__MODULE__{password_hash: hash}, password) do
    Bcrypt.verify_pass(password, hash)
  end

  @doc "Retorna la lista de roles válidos del sistema. Función pura."
  def roles_validos, do: @roles
end
