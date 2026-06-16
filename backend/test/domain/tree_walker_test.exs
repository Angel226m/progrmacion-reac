defmodule HotelFlux.Domain.TreeWalkerTest do
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.TreeWalker

  # ──────────────────────────────────────────────────────────
  # Estructuras de prueba
  # ──────────────────────────────────────────────────────────

  # Árbol de hotel de prueba
  defp hotel_prueba do
    %{
      id: "hotel-1",
      nombre: "Hotel Test",
      pisos: [
        %{
          numero: 1,
          habitaciones: [
            %{id: "h-101", numero: "101", estado: :disponible, capacidad: 2},
            %{id: "h-102", numero: "102", estado: :ocupada, capacidad: 3},
            %{id: "h-103", numero: "103", estado: :disponible, capacidad: 1}
          ]
        },
        %{
          numero: 2,
          habitaciones: [
            %{id: "h-201", numero: "201", estado: :disponible, capacidad: 4},
            %{id: "h-202", numero: "202", estado: :en_limpieza, capacidad: 2}
          ]
        }
      ]
    }
  end

  # ──────────────────────────────────────────────────────────
  # contar_habitaciones/2 — TCO recursivo
  # ──────────────────────────────────────────────────────────

  describe "contar_habitaciones/2 (TCO)" do
    test "cuenta todas las habitaciones del hotel" do
      total = TreeWalker.contar_habitaciones(hotel_prueba(), :todas)
      assert total == 5
    end

    test "cuenta solo habitaciones disponibles" do
      disponibles = TreeWalker.contar_habitaciones(hotel_prueba(), :disponible)
      assert disponibles == 3
    end

    test "cuenta habitaciones ocupadas" do
      ocupadas = TreeWalker.contar_habitaciones(hotel_prueba(), :ocupada)
      assert ocupadas == 1
    end

    test "retorna 0 si no hay habitaciones con ese estado" do
      count = TreeWalker.contar_habitaciones(hotel_prueba(), :bloqueada)
      assert count == 0
    end
  end

  # ──────────────────────────────────────────────────────────
  # agrupar_por_estado/1 — mapeado del árbol
  # ──────────────────────────────────────────────────────────

  describe "agrupar_por_estado/1" do
    test "agrupa habitaciones por estado correctamente" do
      grupos = TreeWalker.agrupar_por_estado(hotel_prueba())

      assert is_map(grupos)
      assert length(grupos[:disponible] || []) == 3
      assert length(grupos[:ocupada] || []) == 1
      assert length(grupos[:en_limpieza] || []) == 1
    end

    test "no incluye estados sin habitaciones" do
      grupos = TreeWalker.agrupar_por_estado(hotel_prueba())
      refute Map.has_key?(grupos, :bloqueada)
    end
  end

  # ──────────────────────────────────────────────────────────
  # buscar_habitacion/2 — recursión estructural
  # ──────────────────────────────────────────────────────────

  describe "buscar_habitacion/2 (recursivo)" do
    test "encuentra habitación existente por id" do
      resultado = TreeWalker.buscar_habitacion(hotel_prueba(), "h-201")
      assert {:ok, habitacion} = resultado
      assert habitacion.numero == "201"
    end

    test "retorna {:error, :no_encontrada} para id inexistente" do
      resultado = TreeWalker.buscar_habitacion(hotel_prueba(), "h-999")
      assert {:error, :no_encontrada} = resultado
    end
  end

  # ──────────────────────────────────────────────────────────
  # recorrer_pisos/2 — TCO con do_recorrer_pisos/3
  # ──────────────────────────────────────────────────────────

  describe "recorrer_pisos/2 (TCO)" do
    test "aplica función a todos los pisos y acumula resultados" do
      contar_por_piso = fn piso ->
        {piso.numero, length(piso.habitaciones)}
      end

      resultado = TreeWalker.recorrer_pisos(hotel_prueba(), contar_por_piso)

      assert is_list(resultado)
      assert length(resultado) == 2
      assert {1, 3} in resultado
      assert {2, 2} in resultado
    end
  end

  # ──────────────────────────────────────────────────────────
  # filtrar_en_arbol/2 — HOF recursivo
  # ──────────────────────────────────────────────────────────

  describe "filtrar_en_arbol/2 (HOF)" do
    test "filtra habitaciones con predicado dado" do
      solo_disponibles = fn h -> h.estado == :disponible end

      resultado = TreeWalker.filtrar_en_arbol(hotel_prueba(), solo_disponibles)
      assert length(resultado) == 3
      assert Enum.all?(resultado, fn h -> h.estado == :disponible end)
    end

    test "retorna lista vacía si ninguna habitación cumple" do
      resultado = TreeWalker.filtrar_en_arbol(hotel_prueba(), fn h -> h.estado == :bloqueada end)
      assert resultado == []
    end
  end

  # ──────────────────────────────────────────────────────────
  # reducir_arbol/3 — fold recursivo
  # ──────────────────────────────────────────────────────────

  describe "reducir_arbol/3 (fold recursivo)" do
    test "reduce todas las habitaciones en un valor acumulado" do
      sumar_capacidad = fn hab, acc -> acc + hab.capacidad end

      total_capacidad = TreeWalker.reducir_arbol(hotel_prueba(), 0, sumar_capacidad)
      # 2 + 3 + 1 + 4 + 2 = 12
      assert total_capacidad == 12
    end

    test "acumulador inicial vacío retorna estructura vacía" do
      ids = TreeWalker.reducir_arbol(hotel_prueba(), [], fn h, acc -> [h.id | acc] end)
      assert length(ids) == 5
    end
  end

  # ──────────────────────────────────────────────────────────
  # profundidad/1 — recursión estructural
  # ──────────────────────────────────────────────────────────

  describe "profundidad/1" do
    test "hotel con pisos tiene profundidad 3 (hotel → pisos → habitaciones)" do
      prof = TreeWalker.profundidad(hotel_prueba())
      assert prof >= 2
    end

    test "hotel sin pisos tiene profundidad 1" do
      hotel_vacio = %{id: "h", nombre: "Vacío", pisos: []}
      prof = TreeWalker.profundidad(hotel_vacio)
      assert prof >= 1
    end
  end
end
