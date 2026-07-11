defmodule HotelFlux.UseCases.CheckoutUseCase do
  @moduledoc """
  Check-out del huésped con Ecto.Multi transaccional.

  FRP:
  - Sin if/else/switch: pattern matching en cláusulas de función
  - Pipeline funcional con Result
  - Ecto.Multi para atomicidad
  - Fan-out reactivo: un evento → múltiples destinos
  - Compensación: si falla la tarea de limpieza, la habitación queda ocupada
  """

  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Evento, as: EventoEsquema
  alias HotelFlux.Events.{CheckoutRealizado, HabitacionLiberada, LimpiezaAsignada}
  alias HotelFlux.Adapters.Repos.{ReservaRepo, HabitacionRepo, TareaRepo, ConsumoRepo}
  alias HotelFlux.Workers.LimpiezaTimeoutWorker

  require Logger

  def ejecutar(reserva_id, usuario \\ nil, ip \\ nil) do
    with {:ok, reserva} <- ReservaRepo.obtener(reserva_id),
         :ok <- validar_checkout(reserva),
         {:ok, total_final} <- calcular_total_final(reserva) do
      multi =
        Ecto.Multi.new()
        |> Ecto.Multi.run(:reserva_estado, fn _repo, _ -> ReservaRepo.actualizar_estado(reserva_id, "checked_out") end)
        |> Ecto.Multi.run(:reserva_total, fn _repo, _ -> ReservaRepo.actualizar_total(reserva_id, total_final) end)
        |> Ecto.Multi.run(:habitacion, fn _repo, _ -> HabitacionRepo.cambiar_estado(reserva.habitacion_id, "en_limpieza") end)
        |> Ecto.Multi.run(:tarea, fn _repo, %{habitacion: habitacion} -> crear_tarea_limpieza(habitacion) end)

      eventos = [
        CheckoutRealizado.nuevo(reserva, total_final, usuario, ip),
        HabitacionLiberada.nuevo(habitacion, usuario, ip),
        LimpiezaAsignada.nuevo(tarea, usuario, ip)
      ]

      multi_con_eventos =
        Enum.reduce(eventos, multi, fn ev, acc_multi ->
          Ecto.Multi.run(acc_multi, :"evento_#{ev.tipo}", fn _repo, _ ->
            Repo.insert(EventoEsquema.changeset(%EventoEsquema{}, Map.from_struct(ev)))
          end)
        end)

      case Repo.transaction(multi_con_eventos) do
        {:ok, %{reserva_estado: reserva_act, habitacion: habitacion, tarea: tarea}} ->

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

  defp validar_checkout(%{estado: "checked_in"}), do: :ok
  defp validar_checkout(_reserva), do: {:error, :estado_invalido}

  defp calcular_total_final(%{total: total} = reserva) do
    consumos_total = ConsumoRepo.total_por_reserva(reserva.id)
    {:ok, Decimal.add(total || Decimal.new(0), consumos_total)}
  end
  defp calcular_total_final(reserva) do
    consumos_total = ConsumoRepo.total_por_reserva(reserva.id)
    {:ok, Decimal.add(Decimal.new(0), consumos_total)}
  end

  defp crear_tarea_limpieza(habitacion) do
    case TareaRepo.empleado_con_menos_carga() do
      {:ok, empleado_id} ->
        TareaRepo.crear(%{habitacion_id: habitacion.id, empleado_id: empleado_id, estado: "pendiente"})
      {:error, :sin_empleados} ->
        TareaRepo.crear(%{habitacion_id: habitacion.id, estado: "pendiente"})
    end
  end

  defp programar_timeout(tarea_id, habitacion_id) do
    LimpiezaTimeoutWorker.programar(tarea_id, habitacion_id)
    |> Oban.insert()
  end

  defp broadcast_checkout(reserva, habitacion, tarea, total_final) do
    pubsub = HotelFlux.PubSub

    Phoenix.PubSub.broadcast(pubsub, "habitaciones", {
      :habitacion_actualizada,
      %{id: habitacion.id, numero: habitacion.numero, estado: "en_limpieza", piso: habitacion.piso}
    })

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

    Phoenix.PubSub.broadcast(pubsub, "dashboard", {
      :checkout_realizado,
      %{reserva_id: reserva.id, total_final: to_string(total_final), habitacion_numero: habitacion.numero}
    })

    Phoenix.PubSub.broadcast(pubsub, "notificaciones", {
      :alerta,
      %{tipo: "checkout", mensaje: "Check-out: Hab. #{habitacion.numero}", nivel: "info"}
    })
  end
end
