defmodule HotelFlux.Domain.EventSourcing do
  @moduledoc """
  📖 Event Sourcing — Reconstrucción de estado desde eventos.

  El estado actual de cualquier entidad ES la proyección acumulada
  de todos sus eventos históricos. No hay "estado mutable" almacenado,
  solo la secuencia inmutable de eventos.

  ## Principios demostrados:
  - **Recursión de cola (TCO)**: `reconstruir_estado/2` usa acumulador explícito
  - **Funciones puras**: mismo evento + mismo estado → mismo estado nuevo
  - **Inmutabilidad**: cada evento produce un nuevo struct, nunca muta
  - **Higher-Order Functions**: `proyectar/3` acepta función de reducción
  - **Pattern matching**: cláusulas por tipo de evento

  ## Flujo:
      evento_1 → evento_2 → evento_3
          ↓           ↓           ↓
      estado_0 → estado_1 → estado_2 → estado_final
  """

  alias HotelFlux.Domain.Evento

  @type estado :: map()
  @type reductor :: (estado(), Evento.t() -> estado())

  # ──────────────────────────────────────────────────
  # RECONSTRUCCIÓN DE ESTADO (Recursión de cola)
  # ──────────────────────────────────────────────────

  @doc """
  Reconstruye el estado final aplicando todos los eventos en orden.
  RECURSIÓN DE COLA — usa función auxiliar con acumulador.

  Equivalente funcional a:
    Enum.reduce(eventos, estado_inicial, &aplicar_evento/2)
  pero implementado con recursión explícita para demostrar el patrón.

  ## Ejemplo
      eventos = [%Evento{tipo: "habitacion.estado_cambiado", payload: %{nuevo_estado: "ocupada"}}]
      EventSourcing.reconstruir_estado(estado_inicial, eventos)
      # → %{...estado con estado: "ocupada"}
  """
  @spec reconstruir_estado(estado(), [Evento.t()]) :: estado()
  def reconstruir_estado(estado_inicial, eventos) when is_list(eventos) do
    # Delega a la función privada con acumulador (TCO)
    do_reconstruir(eventos, estado_inicial)
  end

  @doc """
  Proyecta eventos usando una función de reducción personalizada.
  HOF — acepta `reductor_fn` como parámetro (Higher-Order Function).

  Permite aplicar Event Sourcing a cualquier entidad sin hardcodear
  la lógica de reducción dentro del módulo.

  ## Ejemplo
      reductor = fn estado, evento ->
        case evento.tipo do
          "precio_cambiado" -> %{estado | precio: evento.payload["precio"]}
          _ -> estado
        end
      end
      EventSourcing.proyectar(estado_base, eventos, reductor)
  """
  @spec proyectar(estado(), [Evento.t()], reductor()) :: estado()
  def proyectar(estado_inicial, eventos, reductor_fn)
      when is_list(eventos) and is_function(reductor_fn, 2) do
    Enum.reduce(eventos, estado_inicial, reductor_fn)
  end

  @doc """
  Filtra solo los eventos relevantes para una entidad específica.
  FUNCIÓN PURA — proyección determinista.
  HOF: usa `Enum.filter` con función anónima.
  """
  @spec eventos_de_entidad([Evento.t()], String.t()) :: [Evento.t()]
  def eventos_de_entidad(todos_eventos, entidad_id) when is_list(todos_eventos) do
    Enum.filter(todos_eventos, fn evento ->
      evento.agregado_id == entidad_id
    end)
  end

  @doc """
  Obtiene el snapshot del estado hasta una fecha dada.
  FUNCIÓN PURA — reconstrye el estado en un punto del tiempo.
  Combina: filter (antes de fecha) + reconstruir_estado.
  """
  @spec snapshot_en_fecha(estado(), [Evento.t()], DateTime.t()) :: estado()
  def snapshot_en_fecha(estado_inicial, eventos, hasta_fecha) do
    eventos
    |> Enum.filter(fn evento ->
      DateTime.compare(evento.ocurrido_en, hasta_fecha) in [:lt, :eq]
    end)
    |> then(&reconstruir_estado(estado_inicial, &1))
  end

  @doc """
  Cuenta eventos agrupados por tipo.
  FUNCIÓN PURA — reduce a mapa de conteos.
  Usa recursión de cola a través de Enum.reduce.
  """
  @spec contar_por_tipo([Evento.t()]) :: %{String.t() => non_neg_integer()}
  def contar_por_tipo(eventos) when is_list(eventos) do
    contar_acc(eventos, %{})
  end

  @doc """
  Obtiene el último evento de cada tipo. FUNCIÓN PURA.
  HOF: reduce con actualización condicional.
  """
  @spec ultimo_por_tipo([Evento.t()]) :: %{String.t() => Evento.t()}
  def ultimo_por_tipo(eventos) when is_list(eventos) do
    Enum.reduce(eventos, %{}, fn evento, acc ->
      Map.put(acc, evento.tipo, evento)
    end)
  end

  # ──────────────────────────────────────────────────
  # FUNCIONES PRIVADAS — Recursión de cola explícita
  # ──────────────────────────────────────────────────

  # [RECURSIÓN DE COLA] Caso base: no hay más eventos
  defp do_reconstruir([], estado_acc), do: estado_acc

  # [RECURSIÓN DE COLA] Paso recursivo: aplica primer evento, recursa sobre el resto
  # El resultado acumulado se pasa como argumento (TCO)
  defp do_reconstruir([evento | resto], estado_acc) do
    nuevo_estado = aplicar_evento_de_dominio(estado_acc, evento)
    do_reconstruir(resto, nuevo_estado)
  end

  # Caso base para conteo recursivo
  defp contar_acc([], acc), do: acc

  defp contar_acc([evento | resto], acc) do
    nuevo_acc = Map.update(acc, evento.tipo, 1, &(&1 + 1))
    contar_acc(resto, nuevo_acc)
  end

  # ──────────────────────────────────────────────────
  # APLICADORES DE EVENTOS (Pattern Matching exhaustivo)
  # Cada función: (estado, evento) → nuevo_estado PURO
  # ──────────────────────────────────────────────────

  defp aplicar_evento_de_dominio(estado, %Evento{tipo: "habitacion.estado_cambiado"} = evento) do
    Map.merge(estado, %{estado: evento.payload["nuevo_estado"]})
  end

  defp aplicar_evento_de_dominio(estado, %Evento{tipo: "reserva.creada"} = evento) do
    Map.merge(estado, %{
      reserva_id: evento.agregado_id,
      estado: "pendiente",
      fecha_entrada: evento.payload["fecha_entrada"],
      fecha_salida: evento.payload["fecha_salida"]
    })
  end

  defp aplicar_evento_de_dominio(estado, %Evento{tipo: "reserva.confirmada"}) do
    Map.put(estado, :estado, "confirmada")
  end

  defp aplicar_evento_de_dominio(estado, %Evento{tipo: "reserva.cancelada"}) do
    Map.put(estado, :estado, "cancelada")
  end

  defp aplicar_evento_de_dominio(estado, %Evento{tipo: "checkin.completado"}) do
    Map.put(estado, :estado, "activa")
  end

  defp aplicar_evento_de_dominio(estado, %Evento{tipo: "checkout.completado"}) do
    Map.put(estado, :estado, "completada")
  end

  defp aplicar_evento_de_dominio(estado, %Evento{tipo: "tarea.iniciada"}) do
    Map.put(estado, :estado, "en_proceso")
  end

  defp aplicar_evento_de_dominio(estado, %Evento{tipo: "tarea.completada"}) do
    Map.put(estado, :estado, "completada")
  end

  # Evento desconocido: estado sin cambios (función identidad)
  defp aplicar_evento_de_dominio(estado, _evento_desconocido), do: estado
end
