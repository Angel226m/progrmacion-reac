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
end
