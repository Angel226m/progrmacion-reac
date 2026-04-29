defmodule HotelFlux.Ports.Input do
  @moduledoc """
  📥 Puertos de Entrada — Contratos de la Arquitectura Hexagonal.

  Define los `@behaviour`s que los casos de uso del dominio exponen
  hacia el mundo exterior (controladores HTTP, channels WebSocket, CLI).

  ## Principio:
  El dominio NO sabe nada del mundo exterior. Solo expone contratos
  tipados que la capa de infraestructura implementa.

  En Clean Architecture:
    [Controller/Channel] → [Puerto Input] → [Use Case] → [Puerto Output] → [Repo]
  """

  # ──────────────────────────────────────────────────
  # PUERTO: Gestión de Habitaciones
  # ──────────────────────────────────────────────────

  defmodule GestionHabitaciones do
    @moduledoc "Contrato para operaciones de habitaciones."

    @callback listar(filtros :: map()) ::
                {:ok, [map()]} | {:error, term()}

    @callback obtener(id :: binary()) ::
                {:ok, map()} | {:error, :not_found}

    @callback cambiar_estado(id :: binary(), nuevo_estado :: String.t(), usuario_id :: binary()) ::
                {:ok, map()} | {:error, term()}

    @callback buscar_disponibles(
                fecha_entrada :: Date.t(),
                fecha_salida :: Date.t(),
                filtros :: map()
              ) :: {:ok, [map()]} | {:error, term()}
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Gestión de Reservas
  # ──────────────────────────────────────────────────

  defmodule GestionReservas do
    @moduledoc "Contrato para el ciclo de vida de reservas (incluye Saga)."

    @callback crear(params :: map()) ::
                {:ok, map()} | {:error, term()}

    @callback listar(filtros :: map()) ::
                {:ok, [map()]} | {:error, term()}

    @callback obtener(id :: binary()) ::
                {:ok, map()} | {:error, :not_found}

    @callback actualizar(id :: binary(), params :: map()) ::
                {:ok, map()} | {:error, term()}

    @callback cancelar(id :: binary(), razon :: String.t()) ::
                {:ok, map()} | {:error, term()}
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Check-In / Check-Out
  # ──────────────────────────────────────────────────

  defmodule GestionEstancias do
    @moduledoc "Contrato para check-in y check-out."

    @callback hacer_checkin(reserva_id :: binary(), params :: map()) ::
                {:ok, map()} | {:error, term()}

    @callback hacer_checkout(reserva_id :: binary(), params :: map()) ::
                {:ok, map()} | {:error, term()}
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Gestión de Limpieza
  # ──────────────────────────────────────────────────

  defmodule GestionLimpieza do
    @moduledoc "Contrato para tareas de limpieza."

    @callback asignar(habitacion_id :: binary(), personal_id :: binary()) ::
                {:ok, map()} | {:error, term()}

    @callback listar(filtros :: map()) ::
                {:ok, [map()]} | {:error, term()}

    @callback actualizar_estado(tarea_id :: binary(), nuevo_estado :: String.t()) ::
                {:ok, map()} | {:error, term()}
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Autenticación
  # ──────────────────────────────────────────────────

  defmodule Autenticacion do
    @moduledoc "Contrato para operaciones de autenticación."

    @callback login(email :: String.t(), password :: String.t()) ::
                {:ok, %{token: String.t(), usuario: map()}} | {:error, term()}

    @callback logout(token :: String.t()) ::
                :ok | {:error, term()}

    @callback renovar_token(token :: String.t()) ::
                {:ok, String.t()} | {:error, term()}

    @callback obtener_perfil(usuario_id :: binary()) ::
                {:ok, map()} | {:error, :not_found}
  end

  # ──────────────────────────────────────────────────
  # PUERTO: Ventas / Consumos
  # ──────────────────────────────────────────────────

  defmodule GestionVentas do
    @moduledoc "Contrato para ventas de productos."

    @callback registrar_venta(params :: map()) ::
                {:ok, map()} | {:error, term()}

    @callback listar_productos(filtros :: map()) ::
                {:ok, [map()]} | {:error, term()}
  end
end
