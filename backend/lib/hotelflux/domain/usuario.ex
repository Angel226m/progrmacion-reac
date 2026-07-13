defmodule HotelFlux.Domain.Usuario do
  @moduledoc """
  Entidad de dominio — Usuario/Empleado del hotel.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

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

  def verify_password(%__MODULE__{password_hash: hash}, password) do
    Bcrypt.verify_pass(password, hash)
  end

  def roles_validos, do: @roles
end
