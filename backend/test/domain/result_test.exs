defmodule HotelFlux.Domain.ResultTest do
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.Result
  alias HotelFlux.Domain.Combinators

  # ──────────────────────────────────────────────────────────
  # Result Monad — Railway Oriented Programming
  # ──────────────────────────────────────────────────────────

  describe "ok/1 y error/1 — constructores" do
    test "ok/1 wraps un valor en {:ok, valor}" do
      assert {:ok, 42} = Result.ok(42)
    end

    test "error/1 wraps un error en {:error, razon}" do
      assert {:error, "fallo"} = Result.error("fallo")
    end
  end

  describe "map/2 — transforma el valor si es ok" do
    test "aplica la función si es {:ok, _}" do
      result = Result.ok(5) |> Result.map(fn x -> x * 2 end)
      assert {:ok, 10} = result
    end

    test "no aplica la función si es {:error, _}" do
      result = Result.error("error") |> Result.map(fn x -> x * 2 end)
      assert {:error, "error"} = result
    end
  end

  describe "flat_map/2 — encadena operaciones que pueden fallar" do
    test "encadena dos operaciones exitosas" do
      result =
        Result.ok(10)
        |> Result.flat_map(fn x -> Result.ok(x + 5) end)
        |> Result.flat_map(fn x -> Result.ok(x * 2) end)

      assert {:ok, 30} = result
    end

    test "cortocircuita en el primer error" do
      llamadas = :counters.new(1, [])

      result =
        Result.ok(10)
        |> Result.flat_map(fn _x -> Result.error("primer fallo") end)
        |> Result.flat_map(fn _x ->
          :counters.add(llamadas, 1, 1)
          Result.ok(:no_deberia_ejecutarse)
        end)

      assert {:error, "primer fallo"} = result
      assert :counters.get(llamadas, 1) == 0
    end
  end

  describe "map_error/2 — transforma el error" do
    test "aplica función al error" do
      result = Result.error(:not_found) |> Result.map_error(fn e -> {e, :enriquecido} end)
      assert {:error, {:not_found, :enriquecido}} = result
    end

    test "no afecta un valor {:ok, _}" do
      result = Result.ok(42) |> Result.map_error(fn _e -> :no_ejecutado end)
      assert {:ok, 42} = result
    end
  end

  describe "recover/2 — recuperación de error" do
    test "convierte error en ok usando función" do
      result = Result.error(:timeout) |> Result.recover(fn _e -> Result.ok(0) end)
      assert {:ok, 0} = result
    end

    test "no modifica un ok" do
      result = Result.ok(99) |> Result.recover(fn _e -> Result.ok(0) end)
      assert {:ok, 99} = result
    end
  end

  describe "get_or_else/2 — extrae valor con default" do
    test "retorna el valor si es ok" do
      assert 42 = Result.get_or_else(Result.ok(42), 0)
    end

    test "retorna default si es error" do
      assert 0 = Result.get_or_else(Result.error(:fail), 0)
    end
  end

  describe "sequence/1 — lista de Results → Result de lista (TCO)" do
    test "retorna {:ok, lista} si todos son ok" do
      results = [Result.ok(1), Result.ok(2), Result.ok(3)]
      assert {:ok, [1, 2, 3]} = Result.sequence(results)
    end

    test "retorna {:error, _} si hay algún error" do
      results = [Result.ok(1), Result.error("fallo"), Result.ok(3)]
      assert {:error, "fallo"} = Result.sequence(results)
    end

    test "lista vacía retorna {:ok, []}" do
      assert {:ok, []} = Result.sequence([])
    end
  end

  describe "traverse/2 — map + sequence" do
    test "aplica función y agrupa resultados" do
      inputs = [1, 2, 3]
      result = Result.traverse(inputs, fn x -> Result.ok(x * 10) end)
      assert {:ok, [10, 20, 30]} = result
    end

    test "cortocircuita ante el primer fallo" do
      inputs = [1, 2, 3]
      result = Result.traverse(inputs, fn
        2 -> Result.error(:fallo_en_dos)
        x -> Result.ok(x)
      end)
      assert {:error, :fallo_en_dos} = result
    end
  end

  # ──────────────────────────────────────────────────────────
  # Combinators — ROP Avanzado
  # ──────────────────────────────────────────────────────────

  describe "validate_with/2 — validación con múltiples reglas" do
    test "pasa todas las validaciones" do
      validaciones = [
        fn x -> if x > 0, do: Result.ok(x), else: Result.error("debe ser positivo") end,
        fn x -> if x < 100, do: Result.ok(x), else: Result.error("debe ser menor a 100") end
      ]

      assert {:ok, 50} = Combinators.validate_with(Result.ok(50), validaciones)
    end

    test "falla en la primera validación que no cumple" do
      validaciones = [
        fn x -> if x > 0, do: Result.ok(x), else: Result.error("debe ser positivo") end
      ]

      assert {:error, "debe ser positivo"} = Combinators.validate_with(Result.ok(-1), validaciones)
    end
  end

  describe "then_if/3 — composición condicional" do
    test "aplica función solo si predicado es true" do
      resultado =
        Combinators.then_if(
          Result.ok(10),
          fn x -> x > 5 end,
          fn x -> x * 2 end
        )

      assert {:ok, 20} = resultado
    end

    test "omite función si predicado es false" do
      resultado =
        Combinators.then_if(
          Result.ok(3),
          fn x -> x > 5 end,
          fn x -> Result.ok(x * 2) end
        )

      assert {:ok, 3} = resultado
    end
  end

  describe "tap_ok/2 y tap_error/2 — efectos secundarios sin mutación" do
    test "tap_ok ejecuta efecto y pasa el valor" do
      efecto_ejecutado = :counters.new(1, [])

      resultado =
        Result.ok(42)
        |> Combinators.tap_ok(fn _v -> :counters.add(efecto_ejecutado, 1, 1) end)

      assert {:ok, 42} = resultado
      assert :counters.get(efecto_ejecutado, 1) == 1
    end

    test "tap_error ejecuta efecto en error y pasa el error" do
      efecto_ejecutado = :counters.new(1, [])

      resultado =
        Result.error("algo falló")
        |> Combinators.tap_error(fn _e -> :counters.add(efecto_ejecutado, 1, 1) end)

      assert {:error, "algo falló"} = resultado
      assert :counters.get(efecto_ejecutado, 1) == 1
    end
  end
end
