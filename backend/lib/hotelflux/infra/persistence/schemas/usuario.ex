defmodule HotelFlux.Infra.Persistence.Schema.Usuario do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @roles ~w(admin recepcionista gerente limpieza mantenimiento huesped)

  schema "usuarios" do
    field :nombre, :string
    field :email, :string
    field :password_hash, :string
    field :password, :string, virtual: true
    field :rol, :string
    field :activo, :boolean, default: true
    field :eliminado, :boolean, default: false
    field :eliminado_en, :utc_datetime

    belongs_to :turno, HotelFlux.Infra.Persistence.Schema.Turno

    timestamps(type: :utc_datetime)
  end

  def changeset(usuario, attrs) do
    usuario
    |> cast(attrs, [:nombre, :email, :password, :rol, :activo, :turno_id])
    |> validate_required([:nombre, :email, :password, :rol])
    |> validate_inclusion(:rol, @roles)
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/)
    |> validate_length(:password, min: 8, message: "la contraseña debe tener mínimo 8 caracteres")
    |> validate_format(:password, ~r/[A-Z]/, message: "debe contener al menos una mayúscula")
    |> validate_format(:password, ~r/[0-9]/, message: "debe contener al menos un número")
    |> unique_constraint(:email)
    |> hash_password()
  end

  def update_changeset(usuario, attrs) do
    usuario
    |> cast(attrs, [:nombre, :email, :rol, :activo, :turno_id])
    |> validate_required([:nombre, :email, :rol])
    |> validate_inclusion(:rol, @roles)
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/)
    |> unique_constraint(:email)
  end

  def changeset_perfil(usuario, attrs) do
    usuario
    |> cast(attrs, [:nombre, :email])
    |> validate_required([:nombre, :email])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/)
    |> unique_constraint(:email)
  end

  def changeset_password(usuario, attrs) do
    usuario
    |> cast(attrs, [:password])
    |> validate_required([:password])
    |> validate_length(:password, min: 8, message: "la contraseña debe tener mínimo 8 caracteres")
    |> validate_format(:password, ~r/[A-Z]/, message: "debe contener al menos una mayúscula")
    |> validate_format(:password, ~r/[0-9]/, message: "debe contener al menos un número")
    |> hash_password()
  end

  def soft_delete_changeset(usuario) do
    change(usuario, %{eliminado: true, eliminado_en: DateTime.utc_now(), activo: false})
  end

  def login_changeset(attrs) do
    %__MODULE__{}
    |> cast(attrs, [:email, :password])
    |> validate_required([:email, :password])
  end

  defp hash_password(changeset) do
    case get_change(changeset, :password) do
      nil -> changeset
      password ->
        put_change(changeset, :password_hash, Bcrypt.hash_pwd_salt(password))
    end
  end
end
