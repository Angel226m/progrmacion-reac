defmodule HotelFlux.Domain.Combinators do
  @moduledoc """
  🔧 Combinadores funcionales — Railway Oriented Programming en HotelFlux.

  Provee funciones de composición de alto nivel para construir pipelines
  de transformación robustos sin anidar `case` ni `with`.

  ## Principios demostrados:
  - **Railway Oriented Programming**: dos carriles (Ok/Error)
  - **HOF**: todas las funciones reciben y/o retornan funciones
  - **Composición**: `then_if`, `map_ok`, `flat_map_ok` para encadenar pasos
  - **Funciones puras**: sin efectos secundarios, deterministas
  - **Currying**: `then_if/3` aplica transformación condicionalmente

  ## Uso:
      import HotelFlux.Domain.Combinators

      habitacion
      |> validate_with([&check_disponible/1, &check_capacidad/1])
      |> map_ok(&enriquecer_datos/1)
      |> then_if(&tiene_descuento?/1, &aplicar_descuento/1)
      |> flat_map_ok(&persistir/1)
      |> with_context(:reserva_creation)
  """

  alias HotelFlux.Domain.Result

  # ──────────────────────────────────────────────────
  # COMBINADORES BÁSICOS
  # ──────────────────────────────────────────────────

  @doc """
  Aplica una función solo si el resultado es {:ok, _}.
  HOF: `f` es una función `(value -> new_value)`.
  Alias funcional de `Result.map/2`.

  ## Ejemplo
      {:ok, hab} |> map_ok(&enriquecer/1)    # → {:ok, hab_enriquecida}
      {:error, :x} |> map_ok(&enriquecer/1)  # → {:error, :x}
  """
  @spec map_ok(Result.t(a), (a -> b)) :: Result.t(b) when a: var, b: var
  def map_ok(result, f), do: Result.map(result, f)

  @doc """
  Encadena una función que retorna Result (monadic bind).
  HOF: `f` es una función `(value -> {:ok, x} | {:error, e})`.

  ## Ejemplo
      {:ok, id} |> flat_map_ok(&repo_obtener/1) |> flat_map_ok(&validar/1)
  """
  @spec flat_map_ok(Result.t(a), (a -> Result.t(b))) :: Result.t(b) when a: var, b: var
  def flat_map_ok(result, f), do: Result.flat_map(result, f)

  @doc """
  Aplica transformación condicionalmente.
  HOF + condicional: si `predicado.(value)` es true, aplica `transformacion`.
  Si es false, pasa el resultado sin cambios.
  Si es Error, propaga el error.

  ## Ejemplo
      {:ok, reserva}
      |> then_if(&tiene_descuento_vip?/1, &aplicar_descuento_vip/1)
      # Si tiene descuento VIP → aplica descuento
      # Si no → pasa la reserva tal cual
  """
  @spec then_if(Result.t(a), (a -> boolean()), (a -> a)) :: Result.t(a) when a: var
  def then_if({:ok, value} = ok, predicado, transformacion)
      when is_function(predicado, 1) and is_function(transformacion, 1) do
    if predicado.(value) do
      {:ok, transformacion.(value)}
    else
      ok
    end
  end

  def then_if({:error, _} = error, _predicado, _transformacion), do: error

  @doc """
  Aplica una lista de validaciones en secuencia.
  HOF: recibe lista de funciones `(value -> {:ok, value} | {:error, reason})`.
  Se detiene en el primer error (Railway).

  ## Ejemplo
      habitacion
      |> validate_with([
        fn h -> if h.capacidad > 0, do: {:ok, h}, else: {:error, :capacidad_invalida} end,
        fn h -> if h.precio_noche > 0, do: {:ok, h}, else: {:error, :precio_invalido} end
      ])
  """
  @spec validate_with(Result.t(a) | a, [(a -> Result.t(a))]) :: Result.t(a) when a: var
  def validate_with({:ok, value}, validaciones) when is_list(validaciones) do
    do_validate(value, validaciones)
  end

  def validate_with({:error, _} = error, _validaciones), do: error

  # Cuando se pasa el valor directamente (no envuelto en Result)
  def validate_with(value, validaciones) when is_list(validaciones) do
    do_validate(value, validaciones)
  end

  @doc """
  Añade contexto al error para mejor diagnóstico.
  Envuelve el error en un mapa con contexto adicional.

  ## Ejemplo
      {:error, :not_found}
      |> with_context(:buscar_habitacion)
      # → {:error, %{contexto: :buscar_habitacion, razón: :not_found}}
  """
  @spec with_context(Result.t(a), atom()) :: Result.t(a) when a: var
  def with_context({:ok, _} = ok, _contexto), do: ok

  def with_context({:error, razon}, contexto) do
    {:error, %{contexto: contexto, razon: razon}}
  end

  @doc """
  Aplica un efecto secundario (logging, telemetría) sin modificar el valor.
  HOF: `f` recibe el valor pero su retorno es ignorado.
  Permite "espiar" el pipeline sin romper la composición.

  ## Ejemplo
      {:ok, reserva}
      |> tap_ok(fn r -> Logger.info("Procesando reserva \#{r.id}") end)
      |> flat_map_ok(&persistir/1)
  """
  @spec tap_ok(Result.t(a), (a -> any())) :: Result.t(a) when a: var
  def tap_ok({:ok, value} = ok, f) when is_function(f, 1) do
    f.(value)
    ok
  end

  def tap_ok({:error, _} = error, _f), do: error

  @doc """
  Aplica un efecto cuando hay error (para logging de errores).
  HOF: `f` recibe la razón del error.
  """
  @spec tap_error(Result.t(a), (term() -> any())) :: Result.t(a) when a: var
  def tap_error({:ok, _} = ok, _f), do: ok

  def tap_error({:error, razon} = error, f) when is_function(f, 1) do
    f.(razon)
    error
  end

  @doc """
  Combina dos Results usando una función binaria.
  HOF: retorna Ok si ambos son Ok, Error en cualquier otro caso.
  Equivalente a `liftA2` en Haskell.

  ## Ejemplo
      combine({:ok, habitacion}, {:ok, huesped}, &crear_reserva/2)
  """
  @spec combine(Result.t(a), Result.t(b), (a, b -> c)) :: Result.t(c)
        when a: var, b: var, c: var
  def combine({:ok, a}, {:ok, b}, f) when is_function(f, 2), do: {:ok, f.(a, b)}
  def combine({:error, _} = err, _, _f), do: err
  def combine(_, {:error, _} = err, _f), do: err

  # ──────────────────────────────────────────────────
  # FUNCIONES PRIVADAS
  # ──────────────────────────────────────────────────

  # Caso base: todas las validaciones pasaron
  defp do_validate(value, []), do: {:ok, value}

  # Aplica cada validación; se detiene en el primer error (Railway Oriented)
  defp do_validate(value, [validacion | resto]) do
    case validacion.(value) do
      {:ok, nuevo_value} -> do_validate(nuevo_value, resto)
      {:error, _} = error -> error
    end
  end
end
