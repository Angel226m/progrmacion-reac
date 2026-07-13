defmodule HotelFlux.UseCases.CheckoutUseCase do
  @moduledoc """
  Caso de uso: Check-out del huésped con Ecto.Multi transaccional.

  Principios FRP aplicados:
  - Sin if/else/switch: pattern matching en cláusulas de función
  - Pipeline funcional con Result
  - Ecto.Multi para atomicidad
  - Fan-out reactivo: un evento → múltiples destinos (WebSocket, Oban, BD)
  - Compensación: si falla la tarea de limpieza, la habitación queda ocupada
  """

  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Evento, as: EventoEsquema
  alias HotelFlux.Events.{CheckoutRealizado, HabitacionLiberada, LimpiezaAsignada}
  alias HotelFlux.Adapters.Repos.{ReservaRepo, HabitacionRepo, TareaRepo, ConsumoRepo}
  alias HotelFlux.Workers.LimpiezaTimeoutWorker

  require Logger

  # Punto de entrada: ejecuta el checkout completo de forma transaccional
  def ejecutar(reserva_id, usuario \\ nil, ip \\ nil) do
    with {:ok, reserva} <- ReservaRepo.obtener(reserva_id),
         :ok <- validar_checkout(reserva),
         {:ok, total_final} <- calcular_total_final(reserva) do
      evento_checkout = CheckoutRealizado.nuevo(reserva, total_final, usuario, ip)

      # Construye una transacción con múltiples operaciones atómicas
      multi =
        Ecto.Multi.new()
        |> Ecto.Multi.run(:reserva_estado, fn _repo, _ -> ReservaRepo.actualizar_estado(reserva_id, "checked_out") end)
        |> Ecto.Multi.run(:reserva_total, fn _repo, _ -> ReservaRepo.actualizar_total(reserva_id, total_final) end)
        |> Ecto.Multi.run(:habitacion, fn _repo, _ -> HabitacionRepo.cambiar_estado(reserva.habitacion_id, "en_limpieza") end)
        |> Ecto.Multi.run(:tarea, fn _repo, %{habitacion: habitacion} -> crear_tarea_limpieza(habitacion) end)
        # Persiste el evento de checkout realizado
        |> Ecto.Multi.run(:evento_checkout, fn _repo, _ ->
          Repo.insert(EventoEsquema.changeset(%EventoEsquema{}, Map.from_struct(evento_checkout)))
        end)
        # Persiste el evento de liberación de habitación
        |> Ecto.Multi.run(:evento_liberacion, fn _repo, %{habitacion: habitacion} ->
          Repo.insert(EventoEsquema.changeset(%EventoEsquema{}, Map.from_struct(HabitacionLiberada.nuevo(habitacion, usuario, ip))))
        end)
        # Persiste el evento de asignación de limpieza
        |> Ecto.Multi.run(:evento_limpieza, fn _repo, %{tarea: tarea} ->
          Repo.insert(EventoEsquema.changeset(%EventoEsquema{}, Map.from_struct(LimpiezaAsignada.nuevo(tarea, usuario, ip))))
        end)

      case Repo.transaction(multi) do
        {:ok, %{reserva_estado: reserva_act, habitacion: habitacion, tarea: tarea}} ->
          # Éxito: notifica en tiempo real y programa verificación de limpieza
          broadcast_checkout(reserva_act, habitacion, tarea, total_final)
          programar_timeout(tarea.id, habitacion.id)

          Logger.info("[CheckOut] Reserva #{reserva_id} — Total: #{total_final}")
          {:ok, %{reserva: reserva_act, habitacion: habitacion, tarea_limpieza: tarea, total_final: total_final}}

        {:error, _failed_op, failed_value, _changes} ->
          Logger.error("[CheckOut] Error transacción: #{inspect(failed_value)}")
          {:error, failed_value}
      end
    end
  end

  # Valida que la reserva esté en estado "checked_in" para poder hacer checkout
  defp validar_checkout(%{estado: "checked_in"}), do: :ok
  defp validar_checkout(_reserva), do: {:error, :estado_invalido}

  # Calcula el total final sumando consumos adicionales al total base
  defp calcular_total_final(%{total: total} = reserva) do
    consumos_total = ConsumoRepo.total_por_reserva(reserva.id)
    {:ok, Decimal.add(total || Decimal.new(0), consumos_total)}
  end
  defp calcular_total_final(reserva) do
    consumos_total = ConsumoRepo.total_por_reserva(reserva.id)
    {:ok, Decimal.add(Decimal.new(0), consumos_total)}
  end

  # Crea la tarea de limpieza asignándola al empleado con menos carga laboral
  defp crear_tarea_limpieza(habitacion) do
    case TareaRepo.empleado_con_menos_carga() do
      {:ok, empleado_id} ->
        TareaRepo.crear(%{habitacion_id: habitacion.id, empleado_id: empleado_id, estado: "pendiente"})
      {:error, :sin_empleados} ->
        TareaRepo.crear(%{habitacion_id: habitacion.id, estado: "pendiente"})
    end
  end

  # Programa un job en Oban para verificar timeout de limpieza
  defp programar_timeout(tarea_id, habitacion_id) do
    LimpiezaTimeoutWorker.programar(tarea_id, habitacion_id)
    |> Oban.insert()
  end

  # Fan-out reactivo: notifica a todos los canales WebSocket relevantes
  defp broadcast_checkout(reserva, habitacion, tarea, total_final) do
    pubsub = HotelFlux.PubSub

    # Notifica el cambio de estado de la habitación
    Phoenix.PubSub.broadcast(pubsub, "habitaciones", {
      :habitacion_actualizada,
      %{id: habitacion.id, numero: habitacion.numero, estado: "en_limpieza", piso: habitacion.piso}
    })

    # Notifica la nueva tarea de limpieza al personal
    Phoenix.PubSub.broadcast(pubsub, "limpieza", {
      :nueva_tarea,
      %{
        id: tarea.id,
        habitacion_id: tarea.habitacion_id,
        empleado_id: tarea.empleado_id,
        estado: "pendiente",
        habitacion_numero: habitacion.numero,
        piso: habitacion.piso
      }
    })

    # Actualiza el dashboard con el checkout realizado
    Phoenix.PubSub.broadcast(pubsub, "dashboard", {
      :checkout_realizado,
      %{reserva_id: reserva.id, total_final: to_string(total_final), habitacion_numero: habitacion.numero}
    })

    # Envía una notificación de alerta informativa
    Phoenix.PubSub.broadcast(pubsub, "notificaciones", {
      :alerta,
      %{tipo: "checkout", mensaje: "Check-out: Hab. #{habitacion.numero}", nivel: "info"}
    })
  end
end
