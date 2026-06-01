defmodule HotelFlux.Domain.ProductoTest do
  @moduledoc """
  Tests de la entidad Producto — LABORATORIO FUNCIONAL PURO.

  Principios verificados:
  - [FUNCIÓN PURA] tiene_stock?, descontar_stock: deterministas, sin efectos
  - [INMUTABILIDAD] descontar_stock NO muta el struct — retorna nuevo mapa
  - [TABLA-DRIVEN] predicados y changeset verificados como datos
  - [COMPOSICIÓN] pipeline de descuento acumulado con Enum.reduce
  - [RECURSIÓN FUNCIONAL] reducción de stock como fold
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.Producto

  # ═════════════════════════════════════════════════════════
  # tiene_stock?/1 — predicado puro (tabla-driven)
  # ═════════════════════════════════════════════════════════

  describe "tiene_stock?/1 — predicado puro tabla-driven" do
    @casos_stock [
      {nil,  true,  "nil = ilimitado"},
      {1,    true,  "1 unidad disponible"},
      {100,  true,  "100 unidades"},
      {0,    false, "agotado"}
    ]

    test "tabla completa de predicado stock" do
      Enum.each(@casos_stock, fn {stock, esperado, descripcion} ->
        resultado = Producto.tiene_stock?(%Producto{stock: stock})
        assert resultado == esperado, descripcion
      end)
    end

    test "propiedad: tiene_stock? es determinista" do
      producto = %Producto{stock: 5}
      assert Producto.tiene_stock?(producto) == Producto.tiene_stock?(producto)
    end
  end

  # ═════════════════════════════════════════════════════════
  # descontar_stock/1 — función pura (SIN mutación)
  # ═════════════════════════════════════════════════════════

  describe "descontar_stock/1 — función pura, inmutable" do
    test "retorna mapa vacío cuando stock es nil (no aplica límite)" do
      assert Producto.descontar_stock(%Producto{stock: nil}) == %{}
    end

    test "descuenta 1 unidad del stock" do
      assert Producto.descontar_stock(%Producto{stock: 5}) == %{stock: 4}
    end

    test "no permite stock negativo — límite inferior 0" do
      assert Producto.descontar_stock(%Producto{stock: 0}) == %{stock: 0}
    end

    test "descuenta desde 1 deja stock en 0" do
      assert Producto.descontar_stock(%Producto{stock: 1}) == %{stock: 0}
    end

    test "inmutabilidad: el struct original no muta" do
      producto = %Producto{stock: 10}
      _resultado = Producto.descontar_stock(producto)
      assert producto.stock == 10
    end

    test "composición: pipeline de 3 descontamos con Enum.reduce (fold funcional)" do
      # Reduce funcional: aplica descontar_stock 3 veces acumulando el stock
      stock_inicial = 5
      stock_final =
        Enum.reduce(1..3, stock_inicial, fn _i, stock_actual ->
          case Producto.descontar_stock(%Producto{stock: stock_actual}) do
            %{stock: nuevo} -> nuevo
            %{} -> stock_actual  # nil stock: no cambia
          end
        end)
      assert stock_final == 2
    end

    test "pipeline completo: agota stock a cero con fold" do
      stock_inicial = 3
      stock_final =
        Enum.reduce(1..10, stock_inicial, fn _i, stock_actual ->
          case Producto.descontar_stock(%Producto{stock: stock_actual}) do
            %{stock: nuevo} -> nuevo
            _ -> stock_actual
          end
        end)
      # No puede bajar de 0
      assert stock_final == 0
    end
  end

  # ═════════════════════════════════════════════════════════
  # categorias_validas/0 — función pura (propiedades)
  # ═════════════════════════════════════════════════════════

  describe "categorias_validas/0 — propiedades de la lista" do
    test "retorna lista no vacía" do
      categorias = Producto.categorias_validas()
      assert is_list(categorias)
      assert length(categorias) > 0
    end

    test "todas las categorías del dominio hotelero están presentes" do
      categorias = Producto.categorias_validas()
      principales = ~w(minibar room_service spa lavanderia)
      Enum.each(principales, fn cat ->
        assert cat in categorias, "'#{cat}' debe estar en categorias_validas"
      end)
    end

    test "propiedad: todas las entradas son strings no vacíos" do
      Producto.categorias_validas()
      |> Enum.each(fn cat ->
        assert is_binary(cat)
        assert byte_size(cat) > 0
      end)
    end

    test "propiedad: no hay duplicados en categorías" do
      cats = Producto.categorias_validas()
      assert length(cats) == length(Enum.uniq(cats))
    end
  end

  # ── changeset/2 — validaciones puras ───────────────────

  describe "changeset/2" do
    test "changeset válido con nombre, categoría y precio" do
      attrs = %{nombre: "Agua mineral", categoria: "minibar", precio: Decimal.new("5.00")}
      cs = Producto.changeset(%Producto{}, attrs)
      assert cs.valid?
    end

    test "changeset inválido sin nombre" do
      attrs = %{categoria: "minibar", precio: Decimal.new("5.00")}
      cs = Producto.changeset(%Producto{}, attrs)
      refute cs.valid?
      assert Keyword.has_key?(cs.errors, :nombre)
    end

    test "changeset inválido sin categoría" do
      attrs = %{nombre: "Agua", precio: Decimal.new("5.00")}
      cs = Producto.changeset(%Producto{}, attrs)
      refute cs.valid?
    end

    test "changeset inválido con categoría fuera de rango" do
      attrs = %{nombre: "Agua", categoria: "bar_ilegal", precio: Decimal.new("5.00")}
      cs = Producto.changeset(%Producto{}, attrs)
      refute cs.valid?
      assert Keyword.has_key?(cs.errors, :categoria)
    end

    test "changeset inválido con precio 0" do
      attrs = %{nombre: "Gratis", categoria: "minibar", precio: Decimal.new("0.00")}
      cs = Producto.changeset(%Producto{}, attrs)
      refute cs.valid?
    end

    test "changeset inválido con precio negativo" do
      attrs = %{nombre: "Negativo", categoria: "spa", precio: Decimal.new("-10.00")}
      cs = Producto.changeset(%Producto{}, attrs)
      refute cs.valid?
    end

    test "disponible es true por defecto" do
      producto = %Producto{}
      assert producto.disponible == true
    end

    test "changeset acepta stock opcional" do
      attrs = %{nombre: "Champú", categoria: "lavanderia", precio: Decimal.new("15.00"), stock: 50}
      cs = Producto.changeset(%Producto{}, attrs)
      assert cs.valid?
      assert Ecto.Changeset.get_change(cs, :stock) == 50
    end
  end
end
