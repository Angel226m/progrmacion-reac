defmodule HotelFlux.Domain.Transitions do
  @moduledoc """
  🔀 Máquinas de estado de las entidades del dominio HotelFlux.

  Centraliza TODAS las transiciones válidas como datos inmutables.
  Ninguna función muta nada: cada función es una proyección pura.

  ## Principios demostrados:
  - **Funciones puras**: tablas de transiciones como listas inmutables
  - **Pattern matching**: cláusulas para cada entidad
  - **HOF**: funciones que transforman entidades usando StateMachine
  - **Composición**: `transicionar_habitacion/2` compone validación + transformación
  """

  alias HotelFlux.Domain.StateMachine
  alias HotelFlux.Domain.Habitacion
  alias HotelFlux.Domain.Reserva
  alias HotelFlux.Domain.TareaLimpieza

  # ──────────────────────────────────────────────────
  # TABLAS DE TRANSICIONES (datos inmutables)
  # Tuplas {evento, estado_desde, estado_hasta}
  # ──────────────────────────────────────────────────

  @habitacion_fsm [
    {:reservar,          "disponible",       "reservada"},
    {:liberar_reserva,   "reservada",        "disponible"},
    {:ocupar,            "reservada",        "ocupada"},
    {:solicitar_limpieza,"ocupada",          "en_limpieza"},
    {:completar_limpieza,"en_limpieza",      "disponible"},
    {:iniciar_manten,    "disponible",       "en_mantenimiento"},
    {:iniciar_manten,    "en_limpieza",      "en_mantenimiento"},
    {:completar_manten,  "en_mantenimiento", "disponible"},
    {:bloquear,          "reservada",        "bloqueada"},
    {:bloquear,          "disponible",       "bloqueada"},
    {:bloquear,          "en_mantenimiento", "bloqueada"},
    {:desbloquear,       "bloqueada",        "disponible"},
    {:iniciar_manten,    "ocupada",          "en_mantenimiento"},
    {:iniciar_manten,    "bloqueada",        "en_mantenimiento"}
  ]

  @reserva_fsm [
    {:confirmar,         "pendiente",    "confirmada"},
    {:hacer_checkin,     "confirmada",   "checked_in"},
    {:hacer_checkout,    "checked_in",   "checked_out"},
    {:cancelar,          "confirmada",   "cancelada"},
    {:no_show,           "confirmada",   "checked_out"}
  ]

  @tarea_limpieza_fsm [
    {:iniciar,           "pendiente",    "en_proceso"},
    {:completar,         "en_proceso",   "completada"},
    {:reportar_problema, "en_proceso",   "con_problema"},
    {:resolver_problema, "con_problema", "en_proceso"},
    {:cancelar,          "pendiente",    "cancelada"},
    {:cancelar,          "con_problema", "cancelada"}
  ]

  # ──────────────────────────────────────────────────
  # GETTERS DE TABLAS (funciones puras)
  # ──────────────────────────────────────────────────

  @doc "Retorna la tabla de transiciones de habitaciones. FUNCIÓN PURA."
  @spec tabla_habitacion() :: StateMachine.tabla()
  def tabla_habitacion, do: @habitacion_fsm

  @doc "Retorna la tabla de transiciones de reservas. FUNCIÓN PURA."
  @spec tabla_reserva() :: StateMachine.tabla()
  def tabla_reserva, do: @reserva_fsm

  @doc "Retorna la tabla de transiciones de tareas de limpieza. FUNCIÓN PURA."
  @spec tabla_tarea_limpieza() :: StateMachine.tabla()
  def tabla_tarea_limpieza, do: @tarea_limpieza_fsm

  # ──────────────────────────────────────────────────
  # TRANSFORMACIONES PURAS DE ENTIDADES
  # Cada función: struct_in → {:ok, struct_out} | {:error, razón}
  # ──────────────────────────────────────────────────

  @doc """
  Transiciona una habitación a un nuevo estado.
  FUNCIÓN PURA — devuelve nuevo struct, no muta el original.

  Pipeline funcional:
    habitacion |> validar_evento |> obtener_nuevo_estado |> crear_nuevo_struct
  """
  @spec transicionar_habitacion(Habitacion.t(), atom()) ::
          {:ok, Habitacion.t()} | {:error, :transicion_invalida | :estado_desconocido}
  def transicionar_habitacion(%Habitacion{} = hab, evento) do
    case StateMachine.transicion(hab.estado, evento, @habitacion_fsm) do
      {:ok, nuevo_estado} ->
        # Crea nuevo struct inmutablemente (no muta el original)
        nuevo_hab = %{hab | estado: nuevo_estado}
        {:ok, nuevo_hab}

      {:error, _} = error ->
        error
    end
  end

  @doc """
  Transiciona una reserva a un nuevo estado.
  FUNCIÓN PURA — devuelve nuevo struct con estado actualizado.
  """
  @spec transicionar_reserva(Reserva.t(), atom()) ::
          {:ok, Reserva.t()} | {:error, term()}
  def transicionar_reserva(%Reserva{} = reserva, evento) do
    case StateMachine.transicion(reserva.estado, evento, @reserva_fsm) do
      {:ok, nuevo_estado} -> {:ok, %{reserva | estado: nuevo_estado}}
      {:error, _} = error -> error
    end
  end

  @doc """
  Transiciona una tarea de limpieza.
  FUNCIÓN PURA.
  """
  @spec transicionar_tarea(TareaLimpieza.t(), atom()) ::
          {:ok, TareaLimpieza.t()} | {:error, term()}
  def transicionar_tarea(%TareaLimpieza{} = tarea, evento) do
    case StateMachine.transicion(tarea.estado, evento, @tarea_limpieza_fsm) do
      {:ok, nuevo_estado} -> {:ok, %{tarea | estado: nuevo_estado}}
      {:error, _} = error -> error
    end
  end

  @doc """
  Obtiene los eventos disponibles para una habitación en su estado actual.
  FUNCIÓN PURA — proyección determinista.
  """
  @spec eventos_habitacion(Habitacion.t()) :: [atom()]
  def eventos_habitacion(%Habitacion{estado: estado}) do
    StateMachine.eventos_posibles(estado, @habitacion_fsm)
  end

  @doc """
  Verifica si una habitación puede recibir un evento.
  FUNCIÓN PURA — predicado.
  """
  @spec puede_transicionar_habitacion?(Habitacion.t(), atom()) :: boolean()
  def puede_transicionar_habitacion?(%Habitacion{} = hab, evento) do
    case transicionar_habitacion(hab, evento) do
      {:ok, _} -> true
      {:error, _} -> false
    end
  end
end
