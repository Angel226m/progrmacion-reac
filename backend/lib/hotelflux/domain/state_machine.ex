defmodule HotelFlux.Domain.StateMachine do
  @moduledoc """
  🔄 Máquina de Estados Funcional Genérica — HotelFlux

  Implementa máquinas de estados finitas (FSM) como funciones puras.
  No hay estado mutable: las transiciones son transformaciones de datos.

  ## Principios demostrados:
  - **Función pura**: `transicion/3` siempre retorna el mismo output para el mismo input
  - **Inmutabilidad**: nunca modifica la tabla de transiciones
  - **Pattern matching**: cláusulas múltiples para cada caso
  - **Higher-Order Functions**: recibe listas de tuplas {evento, desde, hasta}
  - **Recursión de cola**: `validar_ruta/3` usa TCO para verificar caminos

  ## Uso:
      transiciones = [
        {:reservar,      "disponible", "reservada"},
        {:ocupar,        "reservada",  "ocupada"},
        {:limpiar,       "ocupada",    "en_limpieza"},
        {:disponibilizar,"en_limpieza","disponible"}
      ]
      StateMachine.transicion("disponible", :reservar, transiciones)
      # → {:ok, "reservada"}
  """

  @type estado        :: String.t()
  @type evento        :: atom()
  @type transicion_t  :: {evento(), estado(), estado()}
  @type tabla         :: [transicion_t()]

  # ──────────────────────────────────────────────────
  # NÚCLEO FUNCIONAL
  # ──────────────────────────────────────────────────

  @doc """
  Ejecuta una transición de estado.
  FUNCIÓN PURA — mismo input → mismo output, sin efectos secundarios.

  ## Parámetros
    - `estado_actual` — estado de origen
    - `evento` — evento que dispara la transición
    - `transiciones` — tabla de transiciones

  ## Retorno
    - `{:ok, nuevo_estado}` si la transición es válida
    - `{:error, :transicion_invalida}` si no existe
    - `{:error, :estado_desconocido}` si el estado no está en la tabla
  """
  @spec transicion(estado(), evento(), tabla()) ::
          {:ok, estado()} | {:error, :transicion_invalida | :estado_desconocido}
  def transicion(estado_actual, evento, transiciones) when is_list(transiciones) do
    # Pattern matching exhaustivo sobre la tabla
    transiciones
    |> Enum.find(fn
      {ev, desde, _hasta} -> ev == evento and desde == estado_actual
      _ -> false
    end)
    |> case do
      {_, _, estado_nuevo} -> {:ok, estado_nuevo}
      nil -> clasificar_error(estado_actual, transiciones)
    end
  end

  @doc """
  Obtiene todos los eventos posibles desde un estado dado.
  FUNCIÓN PURA — proyección sobre la tabla de transiciones.
  Usa Higher-Order Function (filter + map).
  """
  @spec eventos_posibles(estado(), tabla()) :: [evento()]
  def eventos_posibles(estado_actual, transiciones) do
    transiciones
    |> Enum.filter(fn {_ev, desde, _hasta} -> desde == estado_actual end)
    |> Enum.map(fn {ev, _desde, _hasta} -> ev end)
  end

  @doc """
  Obtiene todos los estados destino posibles desde un estado.
  FUNCIÓN PURA — composición de filter + map (HOF).
  """
  @spec estados_destino(estado(), tabla()) :: [estado()]
  def estados_destino(estado_actual, transiciones) do
    transiciones
    |> Enum.filter(fn {_ev, desde, _hasta} -> desde == estado_actual end)
    |> Enum.map(fn {_ev, _desde, hasta} -> hasta end)
    |> Enum.uniq()
  end

  @doc """
  Verifica si un estado existe en la tabla de transiciones.
  FUNCIÓN PURA — predicado determinista.
  """
  @spec estado_valido?(estado(), tabla()) :: boolean()
  def estado_valido?(estado, transiciones) do
    Enum.any?(transiciones, fn {_ev, desde, hasta} ->
      desde == estado or hasta == estado
    end)
  end

  @doc """
  Verifica si existe una ruta entre dos estados (BFS recursivo).
  RECURSIÓN DE COLA con acumulador de visitados para evitar ciclos.
  HOF: usa la tabla como función de siguiente estado.

  ## Ejemplo
      StateMachine.existe_ruta?("disponible", "en_limpieza", transiciones_habitacion)
      # → true
  """
  @spec existe_ruta?(estado(), estado(), tabla()) :: boolean()
  def existe_ruta?(desde, hasta, transiciones) do
    buscar_ruta([desde], hasta, MapSet.new([desde]), transiciones)
  end

  @doc """
  Obtiene todos los estados únicos de la tabla.
  FUNCIÓN PURA — proyección con Enum.reduce.
  """
  @spec todos_los_estados(tabla()) :: [estado()]
  def todos_los_estados(transiciones) do
    transiciones
    |> Enum.reduce(MapSet.new(), fn {_ev, desde, hasta}, acc ->
      acc |> MapSet.put(desde) |> MapSet.put(hasta)
    end)
    |> MapSet.to_list()
    |> Enum.sort()
  end

  @doc """
  Aplica múltiples eventos en secuencia — pipeline de transiciones.
  HOF + RECURSIÓN: `pipeline_resultado` de Pipeline.ex aplicado a FSM.
  Se detiene en el primer error.

  ## Ejemplo
      StateMachine.aplicar_eventos("disponible", [:reservar, :ocupar], transiciones)
      # → {:ok, "ocupada"}
  """
  @spec aplicar_eventos(estado(), [evento()], tabla()) ::
          {:ok, estado()} | {:error, term()}
  def aplicar_eventos(estado_inicial, eventos, transiciones) do
    aplicar_eventos_acc(estado_inicial, eventos, transiciones)
  end

  # ──────────────────────────────────────────────────
  # FUNCIONES PRIVADAS (implementación recursiva)
  # ──────────────────────────────────────────────────

  # Caso base: no hay más eventos
  defp aplicar_eventos_acc(estado_actual, [], _transiciones), do: {:ok, estado_actual}

  # Paso recursivo: aplica el primer evento, continúa con el resto
  defp aplicar_eventos_acc(estado_actual, [evento | resto], transiciones) do
    case transicion(estado_actual, evento, transiciones) do
      {:ok, nuevo_estado} -> aplicar_eventos_acc(nuevo_estado, resto, transiciones)
      {:error, _} = error -> error
    end
  end

  # BFS recursivo con cola y visitados
  defp buscar_ruta([], _hasta, _visitados, _transiciones), do: false

  defp buscar_ruta([hasta | _cola], hasta, _visitados, _transiciones), do: true

  defp buscar_ruta([estado_actual | cola], hasta, visitados, transiciones) do
    vecinos =
      estados_destino(estado_actual, transiciones)
      |> Enum.reject(&MapSet.member?(visitados, &1))

    nuevos_visitados = Enum.reduce(vecinos, visitados, &MapSet.put(&2, &1))
    nueva_cola = cola ++ vecinos

    buscar_ruta(nueva_cola, hasta, nuevos_visitados, transiciones)
  end

  # Clasifica el error: estado desconocido vs transición inválida
  defp clasificar_error(estado_actual, transiciones) do
    case estado_valido?(estado_actual, transiciones) do
      true -> {:error, :transicion_invalida}
      false -> {:error, :estado_desconocido}
    end
  end
end
