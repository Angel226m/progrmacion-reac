defmodule HotelFlux.Domain.TreeWalker do
  @moduledoc """
  🌳 Recorrido recursivo de la jerarquía hotelera.

  Implementa algoritmos de recorrido de árboles sobre la estructura:
    Hotel → Pisos → Habitaciones

  ## Principios demostrados:
  - **Recursión de cola (TCO)**: `recorrer_pisos/2` usa acumulador explícito
  - **Funciones puras**: misma entrada → mismo resultado, sin efectos
  - **HOF**: `mapear_arbol/2`, `filtrar_en_arbol/2` reciben funciones como param
  - **Inmutabilidad**: retorna nuevas estructuras, nunca muta las originales
  - **Pattern matching**: cláusulas para nodos hoja y nodos internos

  ## Estructura de árbol:
      %NodoHotel{
        nombre: "HotelFlux",
        pisos: [
          %NodoPiso{numero: 1, habitaciones: [%Habitacion{...}, ...]},
          %NodoPiso{numero: 2, habitaciones: [...]}
        ]
      }
  """

  # ── Tipos del árbol hotelero ──

  @type habitacion :: map()
  @type nodo_piso :: %{
          numero: integer(),
          nombre: String.t(),
          habitaciones: [habitacion()]
        }
  @type nodo_hotel :: %{
          nombre: String.t(),
          pisos: [nodo_piso()]
        }

  # ──────────────────────────────────────────────────
  # RECORRIDO RECURSIVO
  # ──────────────────────────────────────────────────

  @doc """
  Recorre todos los pisos del hotel.
  Aplica una función `visitante` a cada piso encontrado.
  RECURSIÓN DE COLA con acumulador.

  HOF: `visitante` es una función `(nodo_piso -> result)`.

  ## Ejemplo
      TreeWalker.recorrer_pisos(hotel, fn piso ->
        {piso.numero, length(piso.habitaciones)}
      end)
      # → [{1, 3}, {2, 2}]
  """
  @spec recorrer_pisos(nodo_hotel(), (nodo_piso() -> any())) :: [any()]
  def recorrer_pisos(%{pisos: pisos}, visitante) when is_function(visitante, 1) do
    do_recorrer_pisos(pisos, visitante, [])
  end

  def recorrer_pisos(pisos, visitante) when is_list(pisos) and is_function(visitante, 1) do
    do_recorrer_pisos(pisos, visitante, [])
  end

  @doc """
  Transforma todas las habitaciones del árbol con una función pura.
  HOF: `transformacion` es función `(habitacion -> habitacion_nueva)`.
  Devuelve una nueva estructura de árbol con las habitaciones transformadas.

  ## Ejemplo
      TreeWalker.mapear_arbol(hotel, fn hab ->
        %{hab | precio_noche: hab.precio_noche * 1.18}
      end)
  """
  @spec mapear_arbol(nodo_hotel(), (habitacion() -> habitacion())) :: nodo_hotel()
  def mapear_arbol(%{pisos: pisos} = hotel, transformacion)
      when is_function(transformacion, 1) do
    pisos_transformados =
      Enum.map(pisos, fn piso ->
        habitaciones_nuevas = Enum.map(piso.habitaciones, transformacion)
        %{piso | habitaciones: habitaciones_nuevas}
      end)

    %{hotel | pisos: pisos_transformados}
  end

  @doc """
  Filtra habitaciones en el árbol según un predicado.
  HOF: `predicado` es función `(habitacion -> boolean)`.
  Pisos sin habitaciones (luego del filtro) se eliminan del resultado.

  ## Ejemplo
      TreeWalker.filtrar_en_arbol(hotel, fn hab -> hab.estado == "disponible" end)
  """
  @spec filtrar_en_arbol(nodo_hotel(), (habitacion() -> boolean())) :: [habitacion()]
  def filtrar_en_arbol(%{pisos: pisos}, predicado)
      when is_function(predicado, 1) do
    pisos
    |> Enum.flat_map(fn piso ->
      Enum.filter(piso.habitaciones, predicado)
    end)
  end

  @doc """
  Reduce el árbol a un valor único.
  HOF + RECURSIÓN: aplica `reductor` sobre todas las habitaciones.
  Equivalente a un fold sobre el árbol completo.

  ## Ejemplo
      TreeWalker.reducir_arbol(hotel, 0, fn hab, acc ->
        acc + Decimal.to_float(hab.precio_noche)
      end)
      # → precio total de todas las habitaciones
  """
  @spec reducir_arbol(nodo_hotel(), any(), (habitacion(), any() -> any())) :: any()
  def reducir_arbol(%{pisos: pisos}, valor_inicial, reductor)
      when is_function(reductor, 2) do
    do_reducir_pisos(pisos, valor_inicial, reductor)
  end

  @doc """
  Calcula la profundidad del árbol.
  RECURSIÓN pura: cuenta los niveles (Hotel → Piso → Habitación = 3).
  """
  @spec profundidad(nodo_hotel()) :: non_neg_integer()
  def profundidad(%{pisos: []}), do: 1

  def profundidad(%{pisos: [piso | _]}) do
    1 + profundidad_piso(piso)
  end

  @doc """
  Busca una habitación por id en todo el árbol.
  RECURSIÓN sobre pisos y habitaciones.

  ## Ejemplo
      TreeWalker.buscar_habitacion(hotel, "h-101")
      # → {:ok, %Habitacion{id: "h-101", ...}}
  """
  @spec buscar_habitacion(nodo_hotel(), String.t()) ::
          {:ok, habitacion()} | {:error, :no_encontrada}
  def buscar_habitacion(%{pisos: pisos}, id_buscado) do
    buscar_en_pisos(pisos, id_buscado)
  end

  @doc """
  Conta habitaciones en el árbol con un predicado.
  HOF + RECURSIÓN DE COLA: usa `contar_acc` con acumulador.

  ## Ejemplo
      TreeWalker.contar_habitaciones(hotel, fn h -> h.estado == "disponible" end)
  """
  @spec contar_habitaciones(nodo_hotel(), (habitacion() -> boolean()) | atom()) :: non_neg_integer()
  def contar_habitaciones(%{pisos: pisos}, :todas) do
    contar_acc(pisos, fn _ -> true end, 0)
  end

  def contar_habitaciones(%{pisos: pisos}, estado) when is_atom(estado) do
    contar_acc(pisos, fn h -> h.estado == estado end, 0)
  end

  def contar_habitaciones(%{pisos: pisos}, predicado)
      when is_function(predicado, 1) do
    contar_acc(pisos, predicado, 0)
  end

  @doc """
  Agrupa habitaciones por estado en el árbol completo.
  FUNCIÓN PURA — devuelve mapa de estado → lista de habitaciones.
  """
  @spec agrupar_por_estado(nodo_hotel()) :: %{atom() => [habitacion()]}
  def agrupar_por_estado(%{pisos: pisos}) do
    pisos
    |> Enum.flat_map(fn piso -> piso.habitaciones end)
    |> Enum.group_by(& &1.estado)
  end

  # ──────────────────────────────────────────────────
  # FUNCIONES PRIVADAS (recursión de cola)
  # ──────────────────────────────────────────────────

  # [TCO] Caso base: no hay más pisos
  defp do_recorrer_pisos([], _visitante, acc), do: Enum.reverse(acc)

  # [TCO] Paso recursivo: aplica visitante al piso actual
  defp do_recorrer_pisos([piso | resto], visitante, acc) do
    do_recorrer_pisos(resto, visitante, [visitante.(piso) | acc])
  end

  defp do_reducir_pisos([], valor_acc, _reductor), do: valor_acc

  defp do_reducir_pisos([piso | resto], valor_acc, reductor) do
    nuevo_acc = Enum.reduce(piso.habitaciones, valor_acc, reductor)
    do_reducir_pisos(resto, nuevo_acc, reductor)
  end

  defp profundidad_piso(%{habitaciones: []}), do: 1
  defp profundidad_piso(%{habitaciones: _}), do: 2

  defp buscar_en_pisos([], _numero), do: {:error, :no_encontrada}

  defp buscar_en_pisos([piso | resto], id_buscado) do
    case Enum.find(piso.habitaciones, fn h -> h.id == id_buscado end) do
      nil -> buscar_en_pisos(resto, id_buscado)
      habitacion -> {:ok, habitacion}
    end
  end

  defp contar_acc([], _predicado, acc), do: acc

  defp contar_acc([piso | resto], predicado, acc) do
    conteo_piso = Enum.count(piso.habitaciones, predicado)
    contar_acc(resto, predicado, acc + conteo_piso)
  end
end
