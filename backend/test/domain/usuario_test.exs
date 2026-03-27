defmodule HotelFlux.Domain.UsuarioTest do
  @moduledoc """
  Tests de la entidad Usuario — validación de contraseñas OWASP.
  Verifica que las reglas de seguridad se cumplan:
    - Mínimo 8 caracteres
    - Al menos una mayúscula
    - Al menos un número
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.Usuario

  describe "changeset/2 — validaciones de usuario" do
    test "changeset válido con contraseña segura" do
      attrs = %{
        nombre: "Test User",
        email: "test@example.com",
        password: "Segura123!",
        rol: "recepcionista"
      }
      changeset = Usuario.changeset(%Usuario{}, attrs)
      assert changeset.valid?
    end

    test "rechaza contraseña corta (menos de 8 chars)" do
      attrs = %{nombre: "Test", email: "t@e.com", password: "Ab1!", rol: "admin"}
      changeset = Usuario.changeset(%Usuario{}, attrs)
      refute changeset.valid?
    end

    test "rechaza contraseña sin mayúscula" do
      attrs = %{nombre: "Test", email: "t@e.com", password: "sinmayuscula123!", rol: "admin"}
      changeset = Usuario.changeset(%Usuario{}, attrs)
      refute changeset.valid?
    end

    test "rechaza contraseña sin número" do
      attrs = %{nombre: "Test", email: "t@e.com", password: "SinNumero!!", rol: "admin"}
      changeset = Usuario.changeset(%Usuario{}, attrs)
      refute changeset.valid?
    end

    test "rechaza email inválido" do
      attrs = %{nombre: "Test", email: "not-an-email", password: "Segura123!", rol: "admin"}
      changeset = Usuario.changeset(%Usuario{}, attrs)
      refute changeset.valid?
    end

    test "rechaza rol inválido" do
      attrs = %{nombre: "Test", email: "t@e.com", password: "Segura123!", rol: "superusuario"}
      changeset = Usuario.changeset(%Usuario{}, attrs)
      refute changeset.valid?
    end

    test "acepta todos los roles válidos" do
      roles = ["admin", "gerente", "recepcionista", "limpieza", "mantenimiento"]
      Enum.each(roles, fn rol ->
        attrs = %{nombre: "Test", email: "t#{rol}@e.com", password: "Segura123!", rol: rol}
        changeset = Usuario.changeset(%Usuario{}, attrs)
        assert changeset.valid?, "Rol '#{rol}' debería ser válido"
      end)
    end

    test "hashea la contraseña" do
      attrs = %{nombre: "Test", email: "t@e.com", password: "Segura123!", rol: "admin"}
      changeset = Usuario.changeset(%Usuario{}, attrs)
      hashed = Ecto.Changeset.get_change(changeset, :password_hash)
      assert hashed != nil
      assert hashed != "Segura123!"
      assert String.starts_with?(hashed, "$2b$")
    end

    test "soft delete changeset marca eliminado" do
      usuario = %Usuario{
        id: Ecto.UUID.generate(),
        nombre: "Test",
        email: "t@e.com",
        password_hash: "hash",
        rol: "admin",
        eliminado: false
      }
      changeset = Usuario.soft_delete_changeset(usuario)
      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :eliminado) == true
    end
  end

  describe "changeset_perfil/2 — edición de perfil" do
    test "acepta cambio de nombre y email" do
      usuario = %Usuario{
        id: Ecto.UUID.generate(),
        nombre: "Original",
        email: "original@test.com",
        password_hash: "hash",
        rol: "admin"
      }
      changeset = Usuario.changeset_perfil(usuario, %{nombre: "Nuevo Nombre", email: "nuevo@test.com"})
      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :nombre) == "Nuevo Nombre"
      assert Ecto.Changeset.get_change(changeset, :email) == "nuevo@test.com"
    end

    test "no permite cambiar el rol mediante perfil" do
      usuario = %Usuario{
        id: Ecto.UUID.generate(),
        nombre: "Admin",
        email: "admin@test.com",
        password_hash: "hash",
        rol: "admin"
      }
      changeset = Usuario.changeset_perfil(usuario, %{nombre: "Admin", rol: "limpieza"})
      refute Map.has_key?(changeset.changes, :rol)
    end
  end

  describe "changeset_password/2 — cambio de contraseña" do
    test "acepta contraseña que cumple requisitos OWASP" do
      usuario = %Usuario{
        id: Ecto.UUID.generate(),
        nombre: "Test",
        email: "test@test.com",
        password_hash: Bcrypt.hash_pwd_salt("OldPass123"),
        rol: "recepcionista"
      }
      changeset = Usuario.changeset_password(usuario, %{password: "NuevaSegura1"})
      assert changeset.valid?
      new_hash = Ecto.Changeset.get_change(changeset, :password_hash)
      assert new_hash != nil
      assert String.starts_with?(new_hash, "$2b$")
    end

    test "rechaza contraseña menor a 8 caracteres" do
      usuario = %Usuario{id: Ecto.UUID.generate(), nombre: "T", email: "t@t.com", password_hash: "h", rol: "admin"}
      changeset = Usuario.changeset_password(usuario, %{password: "Ab1"})
      refute changeset.valid?
    end

    test "rechaza contraseña sin mayúscula" do
      usuario = %Usuario{id: Ecto.UUID.generate(), nombre: "T", email: "t@t.com", password_hash: "h", rol: "admin"}
      changeset = Usuario.changeset_password(usuario, %{password: "todominusculas1"})
      refute changeset.valid?
    end

    test "rechaza contraseña sin número" do
      usuario = %Usuario{id: Ecto.UUID.generate(), nombre: "T", email: "t@t.com", password_hash: "h", rol: "admin"}
      changeset = Usuario.changeset_password(usuario, %{password: "SinNumeros!!"})
      refute changeset.valid?
    end
  end
end
