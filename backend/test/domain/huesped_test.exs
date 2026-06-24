defmodule HotelFlux.Domain.HuespedTest do
  @moduledoc """
  Tests de la entidad Huesped — LABORATORIO FUNCIONAL PURO.

  Principios verificados:
  - [FUNCIÓN PURA] nombre_completo/1 — referencial transparente
  - [INMUTABILIDAD] struct no muta tras operaciones
  - [TABLA-DRIVEN] validaciones modeladas como datos, no código
  - [PROPIEDAD] composición y simetría de funciones puras
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.Huesped

  # ── nombre_completo/1 — función pura (tabla-driven) ────

  describe "nombre_completo/1 — función pura, referencialmente transparente" do
    # La tabla es el test: datos → función → resultado esperado
    @casos_nombre [
      {"Ana",   "García",   "Ana García"},
      {"José",  "Ñoño",    "José Ñoño"},
      {"María", "de la Torre", "María de la Torre"},
      {"X",    "Y",        "X Y"}
    ]

    test "tabla de nombres: todos producen 'Nombre Apellido'" do
      Enum.each(@casos_nombre, fn {nombre, apellido, esperado} ->
        huesped = %Huesped{nombre: nombre, apellido: apellido}
        assert Huesped.nombre_completo(huesped) == esperado,
               "Esperado '#{esperado}' para #{nombre}/#{apellido}"
      end)
    end

    test "propiedad: nombre_completo es determinista (pura)" do
      huesped = %Huesped{nombre: "Luis", apellido: "Ramos"}
      # Múltiples llamadas = mismo resultado
      resultado_1 = Huesped.nombre_completo(huesped)
      resultado_2 = Huesped.nombre_completo(huesped)
      assert resultado_1 == resultado_2
    end

    test "inmutabilidad: el struct no cambia después de nombre_completo" do
      huesped = %Huesped{nombre: "Ana", apellido: "Sol"}
      _nombre = Huesped.nombre_completo(huesped)
      assert huesped.nombre == "Ana"
      assert huesped.apellido == "Sol"
    end

    test "composición: map/1 sobre lista de huéspedes produce lista de nombres" do
      huespedes = [
        %Huesped{nombre: "Ana", apellido: "García"},
        %Huesped{nombre: "Luis", apellido: "Torres"},
        %Huesped{nombre: "María", apellido: "Ramos"}
      ]
      nombres = Enum.map(huespedes, &Huesped.nombre_completo/1)
      assert nombres == ["Ana García", "Luis Torres", "María Ramos"]
    end
  end

  # ═════════════════════════════════════════════════════════
  # CHANGESET — validaciones modeladas como datos
  # ═════════════════════════════════════════════════════════

  describe "changeset/2 — tabla-driven, sin base de datos" do
    test "changeset válido con campos mínimos requeridos" do
      attrs = %{nombre: "Carlos", apellido: "Pérez"}
      cs = Huesped.changeset(%Huesped{}, attrs)
      assert cs.valid?
    end

    test "campos requeridos: nombre y apellido son obligatorios" do
      Enum.each([:nombre, :apellido], fn campo ->
        attrs = %{nombre: "Test", apellido: "Test"} |> Map.delete(campo)
        cs = Huesped.changeset(%Huesped{}, attrs)
        refute cs.valid?, "debería fallar sin #{campo}"
        assert Keyword.has_key?(cs.errors, campo)
      end)
    end

    test "emails inválidos rechazados — tabla-driven" do
      emails_invalidos = ["noesmail", "@sin-local", "sin-arroba.com"]
      Enum.each(emails_invalidos, fn email ->
        attrs = %{nombre: "Test", apellido: "Test", email: email}
        cs = Huesped.changeset(%Huesped{}, attrs)
        refute cs.valid?, "email '#{email}' debería ser rechazado"
      end)

      attrs = %{nombre: "Test", apellido: "Test", email: ""}
      cs = Huesped.changeset(%Huesped{}, attrs)
      assert cs.valid?
    end

    test "emails válidos aceptados — tabla-driven" do
      emails_validos = ["a@b.com", "hans@hotel.de", "user+tag@domain.co.pe"]
      Enum.each(emails_validos, fn email ->
        attrs = %{nombre: "Test", apellido: "Test", email: email}
        cs = Huesped.changeset(%Huesped{}, attrs)
        assert cs.valid?, "email '#{email}' debería ser aceptado"
      end)
    end

    test "soft delete: eliminado es false por defecto (valor guardián)" do
      huesped = %Huesped{}
      assert huesped.eliminado == false
      assert huesped.eliminado_en == nil
    end

    test "todos los campos opcionales son aceptados" do
      attrs = %{
        nombre: "María",
        apellido: "Ramos",
        email: "maria@test.pe",
        telefono: "+51999111222",
        documento: "12345678",
        tipo_documento: "DNI",
        nacionalidad: "peruana"
      }

      cs = Huesped.changeset(%Huesped{}, attrs)
      assert cs.valid?
    end
  end
end
