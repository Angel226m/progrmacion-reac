defmodule HotelFlux.Domain.Result do
  @moduledoc """
  🎯 Mónada Result — Railway Oriented Programming (ROP) en Elixir.

  Implementa el patrón funcional `Result<T, E>` para manejo de errores
  sin excepciones. Equivalente a `Either` en Haskell o `Result` en Rust.

  ## Principios demostrados:
  - **Mónada**: `map/2`, `flat_map/2`, `recover/2` siguen las leyes monádicas
  - **Railway Oriented Programming**: los errores "cortocircuitan" el pipeline
  - **Funciones puras**: ninguna función lanza excepciones ni tiene efectos
  - **HOF**: `map/2` y `flat_map/2` reciben funciones como parámetros
  - **Pattern matching**: cláusulas para `{:ok, _}` y `{:error, _}`

  ## Uso:
      import HotelFlux.Domain.Result

      resultado =
        obtener_habitacion(id)
        |> map(&validar_disponibilidad/1)
        |> flat_map(&reservar/1)
        |> map_error(&format_error/1)
        |> get_or_else(%Habitacion{})
  """

  @type t(value) :: {:ok, value} | {:error, term()}

  # ──────────────────────────────────────────────────
  # CONSTRUCTORES
  # ──────────────────────────────────────────────────

  @doc "Crea un Result exitoso. Constructor puro."
  @spec ok(value) :: {:ok, value} when value: var
  def ok(value), do: {:ok, value}

  @doc "Crea un Result fallido. Constructor puro."
  @spec error(reason) :: {:error, reason} when reason: var
  def error(reason), do: {:error, reason}

  # ──────────────────────────────────────────────────
  # TRANSFORMACIONES (Functor + Mónada)
  # ──────────────────────────────────────────────────

  @doc """
  Aplica una función al valor si es Ok; propaga el error si es Error.
  HOF: recibe función `(value -> new_value)`.
  Equivalente a `fmap` en Haskell (Functor law).

  ## Ejemplo
      {:ok, 5} |> Result.map(fn x -> x * 2 end)    # → {:ok, 10}
      {:error, :not_found} |> Result.map(fn x -> x * 2 end) # → {:error, :not_found}
  """
  @spec map(t(a), (a -> b)) :: t(b) when a: var, b: var
  def map({:ok, value}, f) when is_function(f, 1), do: {:ok, f.(value)}
  def map({:error, _} = error, _f), do: error

  @doc """
  Encadena operaciones que pueden fallar. Equivalente a `bind`/`>>=` en Haskell.
  HOF: recibe función `(value -> {:ok, new_value} | {:error, reason})`.

  Permite componer funciones en el "carril de error" sin anidar `case`.

  ## Ejemplo
      {:ok, habitacion_id}
      |> Result.flat_map(&HabitacionRepo.obtener/1)
      |> Result.flat_map(&validar_disponibilidad/1)
      |> Result.flat_map(&crear_reserva/1)
  """
  @spec flat_map(t(a), (a -> t(b))) :: t(b) when a: var, b: var
  def flat_map({:ok, value}, f) when is_function(f, 1), do: f.(value)
  def flat_map({:error, _} = error, _f), do: error

  @doc """
  Transforma el error si el Result es Error; deja Ok intacto.
  HOF: mapeo sobre el "carril de error".

  ## Ejemplo
      {:error, :not_found}
      |> Result.map_error(fn :not_found -> "Habitación no encontrada" end)
      # → {:error, "Habitación no encontrada"}
  """
  @spec map_error(t(a), (term() -> term())) :: t(a) when a: var
  def map_error({:ok, _} = ok, _f), do: ok
  def map_error({:error, reason}, f) when is_function(f, 1), do: {:error, f.(reason)}

  @doc """
  Recupera un error usando una función de recuperación.
  HOF: permite "curar" errores y convertirlos en valores Ok.

  ## Ejemplo
      {:error, :cache_miss}
      |> Result.recover(fn :cache_miss -> {:ok, valor_por_defecto} end)
      # → {:ok, valor_por_defecto}
  """
  @spec recover(t(a), (term() -> t(a))) :: t(a) when a: var
  def recover({:ok, _} = ok, _f), do: ok
  def recover({:error, reason}, f) when is_function(f, 1), do: f.(reason)

  @doc """
  Extrae el valor o retorna un valor por defecto.
  FUNCIÓN PURA — no lanza excepciones.

  ## Ejemplo
      {:ok, habitacion} |> Result.get_or_else(nil)   # → habitacion
      {:error, _} |> Result.get_or_else(nil)          # → nil
  """
  @spec get_or_else(t(a), a) :: a when a: var
  def get_or_else({:ok, value}, _default), do: value
  def get_or_else({:error, _}, default), do: default

  @doc """
  Extrae el valor o ejecuta una función con el error.
  HOF: permite logging o transformación antes de obtener el default.
  """
  @spec get_or_else_with(t(a), (term() -> a)) :: a when a: var
  def get_or_else_with({:ok, value}, _f), do: value
  def get_or_else_with({:error, reason}, f) when is_function(f, 1), do: f.(reason)

  # ──────────────────────────────────────────────────
  # PREDICADOS
  # ──────────────────────────────────────────────────

  @doc "Verdadero si el resultado es Ok. FUNCIÓN PURA predicado."
  @spec ok?(t(any())) :: boolean()
  def ok?({:ok, _}), do: true
  def ok?({:error, _}), do: false

  @doc "Verdadero si el resultado es Error. FUNCIÓN PURA predicado."
  @spec error?(t(any())) :: boolean()
  def error?({:error, _}), do: true
  def error?({:ok, _}), do: false

  # ──────────────────────────────────────────────────
  # COLECCIONES DE RESULTS
  # ──────────────────────────────────────────────────

  @doc """
  Toma una lista de Results y retorna Ok con la lista de valores, o el primer Error.
  Equivalente a `sequence` en Haskell / `Result.all` en Rust.
  RECURSIÓN DE COLA con acumulador.

  ## Ejemplo
      Result.sequence([{:ok, 1}, {:ok, 2}, {:ok, 3}])   # → {:ok, [1, 2, 3]}
      Result.sequence([{:ok, 1}, {:error, :fallo}])       # → {:error, :fallo}
  """
  @spec sequence([t(a)]) :: t([a]) when a: var
  def sequence(results) when is_list(results) do
    do_sequence(results, [])
  end

  @doc """
  Aplica una función a cada elemento y retorna Ok con todos los resultados o el primer Error.
  HOF + secuencia — combina `map` y `sequence`.

  ## Ejemplo
      Result.traverse([1, 2, 3], fn x -> if x > 0, do: {:ok, x * 2}, else: {:error, :neg} end)
      # → {:ok, [2, 4, 6]}
  """
  @spec traverse([a], (a -> t(b))) :: t([b]) when a: var, b: var
  def traverse(lista, f) when is_list(lista) and is_function(f, 1) do
    lista
    |> Enum.map(f)
    |> sequence()
  end

  # Caso base: todos los Results fueron Ok → retorna la lista acumulada
  defp do_sequence([], acc), do: {:ok, Enum.reverse(acc)}
  # Primer Error encontrado → cortocircuita (Railway)
  defp do_sequence([{:error, _} = err | _], _acc), do: err
  # Ok: agrega el valor al acumulador, continúa
  defp do_sequence([{:ok, value} | rest], acc), do: do_sequence(rest, [value | acc])
end
