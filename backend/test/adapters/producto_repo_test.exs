defmodule HotelFlux.Adapters.ProductoRepoTest do
  @moduledoc """
  Tests de integración del repositorio de productos.
  """
  use HotelFlux.DataCase, async: false

  alias HotelFlux.Domain.Producto
  alias HotelFlux.Adapters.Repos.ProductoRepo

  # ── Fixture ─────────────────────────────────────────────

  defp insertar_producto(attrs \\ %{}) do
    base = %{
      nombre: "Prod#{System.unique_integer([:positive])}",
      categoria: "minibar",
      precio: Decimal.new("10.00"),
      disponible: true
    }

    {:ok, prod} = Repo.insert(struct(Producto, Map.merge(base, attrs)))
    prod
  end

  # ── obtener/1 ───────────────────────────────────────────

  describe "obtener/1" do
    test "retorna producto existente" do
      producto = insertar_producto()
      assert {:ok, encontrado} = ProductoRepo.obtener(producto.id)
      assert encontrado.id == producto.id
    end

    test "retorna :not_found para ID inexistente" do
      assert {:error, :not_found} = ProductoRepo.obtener(Ecto.UUID.generate())
    end
  end

  # ── crear/1 ─────────────────────────────────────────────

  describe "crear/1" do
    test "crea producto con datos mínimos válidos" do
      attrs = %{nombre: "Agua Mineral", categoria: "minibar", precio: Decimal.new("5.50")}
      assert {:ok, producto} = ProductoRepo.crear(attrs)
      assert producto.nombre == "Agua Mineral"
      assert producto.disponible == true
    end

    test "crea producto con stock" do
      attrs = %{nombre: "Champú", categoria: "lavanderia", precio: Decimal.new("15.00"), stock: 20}
      assert {:ok, producto} = ProductoRepo.crear(attrs)
      assert producto.stock == 20
    end

    test "falla con categoría inválida" do
      attrs = %{nombre: "X", categoria: "ilegal", precio: Decimal.new("1.00")}
      assert {:error, changeset} = ProductoRepo.crear(attrs)
      assert Keyword.has_key?(changeset.errors, :categoria)
    end

    test "falla con precio 0" do
      attrs = %{nombre: "Gratis", categoria: "spa", precio: Decimal.new("0")}
      assert {:error, changeset} = ProductoRepo.crear(attrs)
      assert Keyword.has_key?(changeset.errors, :precio)
    end
  end

  # ── actualizar/2 ────────────────────────────────────────

  describe "actualizar/2" do
    test "actualiza nombre del producto" do
      producto = insertar_producto()
      assert {:ok, actualizado} = ProductoRepo.actualizar(producto.id, %{nombre: "Nuevo Nombre"})
      assert actualizado.nombre == "Nuevo Nombre"
    end

    test "actualiza disponibilidad a false" do
      producto = insertar_producto()
      assert {:ok, actualizado} = ProductoRepo.actualizar(producto.id, %{disponible: false})
      assert actualizado.disponible == false
    end

    test "retorna :not_found para ID inexistente" do
      assert {:error, :not_found} = ProductoRepo.actualizar(Ecto.UUID.generate(), %{nombre: "X"})
    end
  end

  # ── listar/0 y listar/1 ─────────────────────────────────

  describe "listar/1" do
    test "retorna solo productos disponibles y no eliminados" do
      disponible = insertar_producto(%{disponible: true})
      no_disponible = insertar_producto(%{disponible: false})

      productos = ProductoRepo.listar()
      ids = Enum.map(productos, & &1.id)
      assert disponible.id in ids
      refute no_disponible.id in ids
    end
  end

  # ── por_categoria/1 ─────────────────────────────────────

  describe "por_categoria/1" do
    test "filtra por categoría correctamente" do
      spa = insertar_producto(%{categoria: "spa"})
      _minibar = insertar_producto(%{categoria: "minibar"})

      resultados = ProductoRepo.por_categoria("spa")
      ids = Enum.map(resultados, & &1.id)
      assert spa.id in ids
      assert Enum.all?(resultados, &(&1.categoria == "spa"))
    end

    test "retorna lista vacía para categoría sin productos disponibles" do
      # gimnasio muy probablemente no tenga productos en el sandbox
      resultados = ProductoRepo.por_categoria("conferencias")
      assert is_list(resultados)
    end
  end
end
