defmodule HotelFlux.Domain.UsuarioTest do
  @moduledoc """
  Tests de la entidad Usuario — validación de contraseñas OWASP y funciones de dominio.
  Los changesets se prueban contra el Schema (capa de persistencia),
  las funciones de dominio se prueban directamente contra la entidad pura.
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.Usuario
  alias HotelFlux.Infra.Persistence.Schema.Usuario, as: UsuarioEsquema

  describe "verify_password/2" do
    test "verifica contraseña correcta contra hash" do
      hash = Bcrypt.hash_pwd_salt("Segura123!")
      usuario = %Usuario{id: Ecto.UUID.generate(), nombre: "Test",
        email: "t@t.com", password_hash: hash, rol: "admin"}
      assert Usuario.verify_password(usuario, "Segura123!")
      refute Usuario.verify_password(usuario, "WrongPass1")
    end
  end

  describe "roles_validos/0" do
    test "retorna lista de roles válidos" do
      assert Usuario.roles_validos() |> is_list()
      assert "admin" in Usuario.roles_validos()
    end
  end

  describe "UsuarioEsquema.changeset/2 — validaciones de schema" do
    test "changeset válido con contraseña segura" do
      attrs = %{
        nombre: "Test User",
        email: "test@example.com",
        password: "Segura123!",
        rol: "recepcionista"
      }
      changeset = UsuarioEsquema.changeset(%UsuarioEsquema{}, attrs)
      assert changeset.valid?
    end

    test "rechaza contraseña corta (menos de 8 chars)" do
      attrs = %{nombre: "Test", email: "t@e.com", password: "Ab1!", rol: "admin"}
      changeset = UsuarioEsquema.changeset(%UsuarioEsquema{}, attrs)
      refute changeset.valid?
    end

    test "rechaza contraseña sin mayúscula" do
      attrs = %{nombre: "Test", email: "t@e.com", password: "sinmayuscula123!", rol: "admin"}
      changeset = UsuarioEsquema.changeset(%UsuarioEsquema{}, attrs)
      refute changeset.valid?
    end

    test "rechaza contraseña sin número" do
      attrs = %{nombre: "Test", email: "t@e.com", password: "SinNumero!!", rol: "admin"}
      changeset = UsuarioEsquema.changeset(%UsuarioEsquema{}, attrs)
      refute changeset.valid?
    end

    test "rechaza email inválido" do
      attrs = %{nombre: "Test", email: "not-an-email", password: "Segura123!", rol: "admin"}
      changeset = UsuarioEsquema.changeset(%UsuarioEsquema{}, attrs)
      refute changeset.valid?
    end

    test "rechaza rol inválido" do
      attrs = %{nombre: "Test", email: "t@e.com", password: "Segura123!", rol: "superusuario"}
      changeset = UsuarioEsquema.changeset(%UsuarioEsquema{}, attrs)
      refute changeset.valid?
    end

    test "acepta todos los roles válidos" do
      roles = ["admin", "gerente", "recepcionista", "limpieza", "mantenimiento"]
      Enum.each(roles, fn rol ->
        attrs = %{nombre: "Test", email: "t#{rol}@e.com", password: "Segura123!", rol: rol}
        changeset = UsuarioEsquema.changeset(%UsuarioEsquema{}, attrs)
        assert changeset.valid?, "Rol '#{rol}' debería ser válido"
      end)
    end

    test "hashea la contraseña" do
      attrs = %{nombre: "Test", email: "t@e.com", password: "Segura123!", rol: "admin"}
      changeset = UsuarioEsquema.changeset(%UsuarioEsquema{}, attrs)
      hashed = Ecto.Changeset.get_change(changeset, :password_hash)
      assert hashed != nil
      assert hashed != "Segura123!"
      assert String.starts_with?(hashed, "$2b$")
    end

    test "soft delete changeset marca eliminado" do
      usuario = %UsuarioEsquema{
        id: Ecto.UUID.generate(),
        nombre: "Test",
        email: "t@e.com",
        password_hash: "hash",
        rol: "admin",
        eliminado: false
      }
      changeset = UsuarioEsquema.soft_delete_changeset(usuario)
      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :eliminado) == true
    end
  end

  describe "UsuarioEsquema.changeset_perfil/2 — edición de perfil" do
    test "acepta cambio de nombre y email" do
      usuario = %UsuarioEsquema{
        id: Ecto.UUID.generate(),
        nombre: "Original",
        email: "original@test.com",
        password_hash: "hash",
        rol: "admin"
      }
      changeset = UsuarioEsquema.changeset_perfil(usuario, %{nombre: "Nuevo Nombre", email: "nuevo@test.com"})
      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :nombre) == "Nuevo Nombre"
      assert Ecto.Changeset.get_change(changeset, :email) == "nuevo@test.com"
    end

    test "no permite cambiar el rol mediante perfil" do
      usuario = %UsuarioEsquema{
        id: Ecto.UUID.generate(),
        nombre: "Admin",
        email: "admin@test.com",
        password_hash: "hash",
        rol: "admin"
      }
      changeset = UsuarioEsquema.changeset_perfil(usuario, %{nombre: "Admin", rol: "limpieza"})
      refute Map.has_key?(changeset.changes, :rol)
    end
  end

  describe "UsuarioEsquema.changeset_password/2 — cambio de contraseña" do
    test "acepta contraseña que cumple requisitos OWASP" do
      usuario = %UsuarioEsquema{
        id: Ecto.UUID.generate(),
        nombre: "Test",
        email: "test@test.com",
        password_hash: Bcrypt.hash_pwd_salt("OldPass123"),
        rol: "recepcionista"
      }
      changeset = UsuarioEsquema.changeset_password(usuario, %{password: "NuevaSegura1"})
      assert changeset.valid?
      new_hash = Ecto.Changeset.get_change(changeset, :password_hash)
      assert new_hash != nil
      assert String.starts_with?(new_hash, "$2b$")
    end

    test "rechaza contraseña menor a 8 caracteres" do
      usuario = %UsuarioEsquema{id: Ecto.UUID.generate(), nombre: "T", email: "t@t.com", password_hash: "h", rol: "admin"}
      changeset = UsuarioEsquema.changeset_password(usuario, %{password: "Ab1"})
      refute changeset.valid?
    end

    test "rechaza contraseña sin mayúscula" do
      usuario = %UsuarioEsquema{id: Ecto.UUID.generate(), nombre: "T", email: "t@t.com", password_hash: "h", rol: "admin"}
      changeset = UsuarioEsquema.changeset_password(usuario, %{password: "todominusculas1"})
      refute changeset.valid?
    end

    test "rechaza contraseña sin número" do
      usuario = %UsuarioEsquema{id: Ecto.UUID.generate(), nombre: "T", email: "t@t.com", password_hash: "h", rol: "admin"}
      changeset = UsuarioEsquema.changeset_password(usuario, %{password: "SinNumeros!!"})
      refute changeset.valid?
    end
  end
end
