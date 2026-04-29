defmodule HotelFlux.Domain.Pipeline do
  @moduledoc """
  🔥 Módulo de composición funcional — Patrones HOF para el dominio hotelero.

  Demuestra los conceptos nucleares de Programación Funcional:

  1. **Composición de funciones** — `compose/1` y `pipe/1`
  2. **Currying / aplicación parcial** — `parcial/2`, `parcial3/3`
  3. **Higher-Order Functions** — funciones que reciben/retornan funciones
  4. **Mónada Result (Either)** — `pipeline_resultado/2` encadena pasos que fallan
  5. **Recursión de cola** — `mapear/2`, `filtrar/2`, `reducir/3`
  6. **Inmutabilidad** — ninguna función modifica el argumento de entrada

  Estas son las bases matemáticas del λ-cálculo implementadas en Elixir.
  """

  # ─────────────────────────────────────────────────────────────────
  # COMPOSICIÓN DE FUNCIONES
  # ─────────────────────────────────────────────────────────────────

  @doc """
  Compone una lista de funciones de DERECHA a IZQUIERDA.
  HOF clásica: `compose([f, g]).(x) == f.(g.(x))`

  ## Ejemplo
      double = fn x -> x * 2 end
      add_one = fn x -> x + 1 end
      transform = Pipeline.compose([double, add_one])
      transform.(5)  # → 12  (double(add_one(5)))
  """
  def compose([]), do: fn x -> x end
  def compose([f]), do: f

  def compose([f | rest]) do
    rest_composed = compose(rest)
    # HOF: retorna una nueva función (closure)
    fn x -> f.(rest_composed.(x)) end
  end

  @doc """
  Pipe: composición de IZQUIERDA a DERECHA (orden natural de lectura).
  HOF: `pipe([f, g, h]).(x) == h(g(f(x)))`

  ## Ejemplo
      transform = Pipeline.pipe([
        fn h -> %{h | estado: "disponible"} end,
        fn h -> Map.put(h, :procesado, true) end
      ])
      transform.(habitacion)
  """
  def pipe(fns) when is_list(fns) do
    compose(Enum.reverse(fns))
  end

  # ─────────────────────────────────────────────────────────────────
  # CURRYING / APLICACIÓN PARCIAL
  # ─────────────────────────────────────────────────────────────────

  @doc """
  Aplica parcialmente una función de 2 argumentos — currying funcional.
  HOF: retorna una función de 1 argumento con el primero ya capturado.

  ## Ejemplo
      suma = fn a, b -> a + b end
      suma_cinco = Pipeline.parcial(suma, 5)
      suma_cinco.(3)   # → 8
      suma_cinco.(10)  # → 15
  """
  def parcial(f, arg1) when is_function(f, 2) do
    fn arg2 -> f.(arg1, arg2) end
  end

  @doc """
  Aplicación parcial de función de 3 argumentos — fija el primero.
  """
  def parcial3(f, arg1) when is_function(f, 3) do
    fn arg2, arg3 -> f.(arg1, arg2, arg3) end
  end

  @doc """
  Memoriza el resultado de una función pura (memoization funcional).
  HOF: envuelve una función con caché de resultados (solo para funciones puras).
  """
  def memoize(f) when is_function(f, 1) do
    agent = Agent.start_link(fn -> %{} end) |> elem(1)

    fn arg ->
      cache = Agent.get(agent, & &1)

      case Map.fetch(cache, arg) do
        {:ok, resultado} ->
          resultado

        :error ->
          resultado = f.(arg)
          Agent.update(agent, &Map.put(&1, arg, resultado))
          resultado
      end
    end
  end

  # ─────────────────────────────────────────────────────────────────
  # MÓNADA RESULT (Either) — Pipeline que puede fallar
  # ─────────────────────────────────────────────────────────────────

  @doc """
  Pipeline monádico Result — encadena funciones que pueden fallar.
  HOF + RECURSIÓN: cada paso es una función `valor -> {:ok, nuevo} | {:error, razón}`.

  Si cualquier paso falla, el pipeline se detiene y retorna el error.
  Equivalente funcional del `with` de Elixir pero como valor de primera clase.

  ## Ejemplo
      Pipeline.pipeline_resultado([
        fn x -> if x > 0, do: {:ok, x * 2}, else: {:error, :negativo} end,
        fn x -> {:ok, x + 1} end
      ], 5)
      # → {:ok, 11}

      Pipeline.pipeline_resultado([
        fn _x -> {:error, :fallo} end,
        fn x -> {:ok, x + 1} end  # nunca se ejecuta
      ], 5)
      # → {:error, :fallo}
  """
  def pipeline_resultado([], valor), do: {:ok, valor}

  def pipeline_resultado([paso | resto], valor) do
    case paso.(valor) do
      {:ok, nuevo_valor} -> pipeline_resultado(resto, nuevo_valor)
      {:error, _} = error -> error
    end
  end

  # ─────────────────────────────────────────────────────────────────
  # HIGHER-ORDER FUNCTIONS RECURSIVAS
  # Implementaciones manuales para demostrar el patrón (sin Enum)
  # ─────────────────────────────────────────────────────────────────

  @doc """
  Aplica una función a cada elemento. HOF + RECURSIÓN de cola.
  Implementación manual de map/2 para demostrar el patrón recursivo.

  ## Ejemplo
      Pipeline.mapear([1, 2, 3], fn x -> x * 2 end)
      # → [2, 4, 6]
  """
  def mapear(lista, f), do: mapear_acc(lista, f, [])

  defp mapear_acc([], _f, acc), do: Enum.reverse(acc)
  defp mapear_acc([h | t], f, acc), do: mapear_acc(t, f, [f.(h) | acc])

  @doc """
  Filtra una lista con una función predicado. HOF + RECURSIÓN de cola.

  ## Ejemplo
      Pipeline.filtrar([1, 2, 3, 4], fn x -> rem(x, 2) == 0 end)
      # → [2, 4]
  """
  def filtrar(lista, predicado), do: filtrar_acc(lista, predicado, [])

  defp filtrar_acc([], _pred, acc), do: Enum.reverse(acc)

  defp filtrar_acc([h | t], pred, acc) do
    if pred.(h),
      do: filtrar_acc(t, pred, [h | acc]),
      else: filtrar_acc(t, pred, acc)
  end

  @doc """
  Reduce una lista con función acumuladora. HOF + RECURSIÓN de cola.
  Implementación de fold-left (izquierda a derecha).

  ## Ejemplo
      Pipeline.reducir([1, 2, 3, 4], fn acc, x -> acc + x end, 0)
      # → 10
  """
  def reducir([], _f, acum), do: acum

  def reducir([h | t], f, acum) do
    nuevo_acum = f.(acum, h)
    reducir(t, f, nuevo_acum)
  end

  @doc """
  Aplana una lista de listas. RECURSIÓN de cola.

  ## Ejemplo
      Pipeline.aplanar([[1, 2], [3], [4, 5]])
      # → [1, 2, 3, 4, 5]
  """
  def aplanar(listas), do: aplanar_acc(listas, [])

  defp aplanar_acc([], acc), do: Enum.reverse(acc)
  defp aplanar_acc([[] | resto], acc), do: aplanar_acc(resto, acc)
  defp aplanar_acc([[h | t] | resto], acc), do: aplanar_acc([t | resto], [h | acc])

  @doc """
  zipWith: combina dos listas elemento a elemento con una función.
  HOF: la función de combinación es un parámetro.

  ## Ejemplo
      Pipeline.zip_with([1, 2, 3], [4, 5, 6], fn a, b -> a + b end)
      # → [5, 7, 9]
  """
  def zip_with(lista1, lista2, f), do: zip_acc(lista1, lista2, f, [])

  defp zip_acc([], _l2, _f, acc), do: Enum.reverse(acc)
  defp zip_acc(_l1, [], _f, acc), do: Enum.reverse(acc)

  defp zip_acc([h1 | t1], [h2 | t2], f, acc) do
    zip_acc(t1, t2, f, [f.(h1, h2) | acc])
  end

  # ─────────────────────────────────────────────────────────────────
  # GENERADORES DE FUNCIONES — "Fábricas de predicados"
  # ─────────────────────────────────────────────────────────────────

  @doc """
  HOF: retorna un predicado que verifica si un campo tiene el valor dado.
  Patrón: función que devuelve función (closure sobre campo y valor).

  ## Ejemplo
      disponible? = Pipeline.campo_igual(:estado, "disponible")
      Enum.filter(habitaciones, disponible?)
  """
  def campo_igual(campo, valor) do
    fn struct -> Map.get(struct, campo) == valor end
  end

  @doc """
  HOF: retorna la composición de dos predicados (AND lógico).

  ## Ejemplo
      filtro = Pipeline.y(
        Pipeline.campo_igual(:estado, "disponible"),
        fn h -> h.capacidad >= 2 end
      )
  """
  def y(pred1, pred2) do
    fn x -> pred1.(x) and pred2.(x) end
  end

  @doc """
  HOF: retorna la disyunción de dos predicados (OR lógico).
  """
  def o(pred1, pred2) do
    fn x -> pred1.(x) or pred2.(x) end
  end

  @doc """
  HOF: retorna la negación de un predicado.
  """
  def no(pred) do
    fn x -> not pred.(x) end
  end
end
