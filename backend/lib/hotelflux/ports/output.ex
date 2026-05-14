defmodule HotelFlux.Ports.Output do
  @moduledoc """
  📤 Puertos de Salida — Contratos hacia la infraestructura.

  Define los `@behaviour`s que el dominio requiere de la infraestructura
  (repositorios, cache, notificaciones, emails, pagos).

  ## Principio:
  El dominio DEPENDE de estas abstracciones, no de implementaciones concretas.
  Permite intercambiar PostgreSQL por otra DB sin tocar el dominio.
  Facilita el testeo con mocks que implementen los mismos behaviours.

  ## Arquitectura:
    [Domain/UseCase] → [Puerto Output] ← implements ← [Adapter/Repo]
                                       ← implements ← [MockRepo (tests)]
  """

  # ──────────────────────────────────────────────────
  # PUERTO: Repositorio de Habitaciones
  # ──────────────────────────────────────────────────

  defmodule HabitacionRepository do
    @moduledoc "Contrato de persistencia para habitaciones."

    @callback obtener(binary()) :: {:ok, map()} | {:error, :not_found}
    @callback listar(map()) :: [map()]
    @callback crear(map()) :: {:ok, map()} | {:error, term()}
    @callback actualizar(binary(), map()) :: {:ok, map()} | {:error, term()}
    @callback cambiar_estado(binary(), String.t()) :: {:ok, map()} | {:error, term()}
    @callback buscar_disponibles(map()) :: [map()]
    @callback contar_por_estado() :: map()
    @callback soft_delete(binary()) :: {:ok, map()} | {:error, term()}
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Repositorio de Reservas
  # ──────────────────────────────────────────────────

  defmodule ReservaRepository do
    @moduledoc "Contrato de persistencia para reservas."

    @callback obtener(binary()) :: {:ok, map()} | {:error, :not_found}
    @callback listar(map()) :: [map()]
    @callback crear(map()) :: {:ok, map()} | {:error, term()}
    @callback actualizar(binary(), map()) :: {:ok, map()} | {:error, term()}
    @callback listar_activas() :: [map()]
    @callback verificar_disponibilidad(binary(), Date.t(), Date.t()) :: boolean()
    @callback soft_delete(binary()) :: {:ok, map()} | {:error, term()}
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Repositorio de Huéspedes
  # ──────────────────────────────────────────────────

  defmodule HuespedRepository do
    @moduledoc "Contrato de persistencia para huéspedes."

    @callback obtener(binary()) :: {:ok, map()} | {:error, :not_found}
    @callback buscar_por_documento(String.t()) :: {:ok, map()} | {:error, :not_found}
    @callback listar(map()) :: [map()]
    @callback crear_o_actualizar(map()) :: {:ok, map()} | {:error, term()}
    @callback soft_delete(binary()) :: {:ok, map()} | {:error, term()}
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Servicio de Notificaciones
  # ──────────────────────────────────────────────────

  defmodule NotificacionService do
    @moduledoc "Contrato para emisión de notificaciones."

    @callback publicar(topic :: String.t(), evento :: String.t(), payload :: map()) :: :ok
    @callback broadcast_habitacion(habitacion_id :: binary(), payload :: map()) :: :ok
    @callback broadcast_dashboard(metricas :: map()) :: :ok
    @callback notificar_saga(saga_id :: binary(), paso :: integer(), estado :: String.t()) :: :ok
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Servicio de Caché
  # ──────────────────────────────────────────────────

  defmodule CacheService do
    @moduledoc "Contrato para operaciones de caché (Redis)."

    @callback get(key :: String.t()) :: {:ok, term()} | {:error, :miss}
    @callback set(key :: String.t(), value :: term(), ttl_sec :: integer()) :: :ok
    @callback delete(key :: String.t()) :: :ok
    @callback increment(key :: String.t()) :: {:ok, integer()}
    @callback exists?(key :: String.t()) :: boolean()
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Repositorio de Eventos de Dominio
  # ──────────────────────────────────────────────────

  defmodule EventRepository do
    @moduledoc "Contrato para Event Sourcing — persistencia de eventos inmutables."

    @callback registrar(tipo :: String.t(), entidad_id :: binary(), payload :: map()) ::
                {:ok, map()} | {:error, term()}

    @callback obtener_por_entidad(entidad_id :: binary()) :: [map()]

    @callback obtener_por_tipo(tipo :: String.t(), opts :: map()) :: [map()]

    @callback obtener_recientes(limit :: integer()) :: [map()]
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Servicio de Pagos
  # ──────────────────────────────────────────────────

  defmodule PagoService do
    @moduledoc "Contrato para procesamiento de pagos."

    @callback procesar(params :: map()) :: {:ok, map()} | {:error, term()}
    @callback reembolsar(pago_id :: binary()) :: {:ok, map()} | {:error, term()}
    @callback verificar(pago_id :: binary()) :: {:ok, map()} | {:error, :not_found}
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Observable Repository
  #
  # Patrón Observable Repository en Elixir:
  # En lugar de devolver un valor puntual, el repositorio
  # difunde cambios vía Phoenix.PubSub cuando los datos mutan.
  #
  # La "suscripción" es Phoenix.PubSub.subscribe/2.
  # El "stream de cambios" es el buzón de mensajes del proceso suscrito.
  #
  # Esto es Observer aplicado a la capa de datos:
  #   mutación → broadcast → PubSub → Channel → WebSocket → RxJS Observable
  #
  # Cada módulo que implemente este behaviour debe:
  #   1. Definir el topic de PubSub en @topic_cambios
  #   2. Llamar a broadcast_cambio/2 tras cada mutación
  #   3. Implementar suscribir_cambios/1 que registra al proceso llamador
  # ──────────────────────────────────────────────────

  defmodule ObservableRepository do
    @moduledoc """
    Behaviour que convierte cualquier repositorio en Observable.

    Observable Repository Pattern:
      - El repositorio emite eventos cuando sus datos cambian.
      - Los consumidores (Channels, Workers) se suscriben al topic PubSub.
      - El flujo: mutación → broadcast_cambio → PubSub → Channel → WS → RxJS.

    Implementación en Elixir usando Phoenix.PubSub como bus de eventos:
      - suscribir_cambios/1 → llama Phoenix.PubSub.subscribe
      - broadcast_cambio/2  → llama Phoenix.PubSub.broadcast
      - topic_cambios/0     → retorna el topic string único por entidad
    """

    @callback topic_cambios() :: String.t()

    @callback suscribir_cambios(opts :: map()) :: :ok | {:error, term()}

    @callback broadcast_cambio(tipo_evento :: String.t(), payload :: map()) :: :ok

    @optional_callbacks suscribir_cambios: 1
  end
end
