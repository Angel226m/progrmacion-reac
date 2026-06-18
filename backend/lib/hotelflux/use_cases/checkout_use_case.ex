defmodule HotelFlux.UseCases.CheckoutUseCase do
  @moduledoc """
  Caso de uso: Check-out del huésped.

  🔥 PIEZA CLAVE REACTIVA: Un solo evento de checkout dispara
  MÚLTIPLES streams simultáneamente:

  1. Mapa SVG → habitación cambia a "en_limpieza" (recepción)
  2. Limpieza → nueva tarea aparece en tablet del personal
  3. Dashboard → métricas de ocupación se actualizan
  4. Lista de espera → si hay reserva pendiente, se asigna automáticamente

  Demuestra: Un evento → múltiples destinos reactivos (fan-out reactivo).

  Pipeline funcional:
    reserva |> calcular_total |> liberar_habitacion |> crear_tarea_limpieza
            |> registrar_evento |> broadcast_multiple
  """

  alias HotelFlux.Repo
  alias HotelFlux.Domain.{Evento, Pipeline}
  alias HotelFlux.Events.{CheckoutRealizado, HabitacionLiberada, LimpiezaAsignada}
  alias HotelFlux.Adapters.Repos.{ReservaRepo, HabitacionRepo, TareaRepo, ConsumoRepo}
  alias HotelFlux.Workers.LimpiezaTimeoutWorker

  require Logger

  def ejecutar(reserva_id, usuario \\ nil, ip \\ nil) do
    with {:ok, reserva} <- ReservaRepo.obtener(reserva_id),
         :ok <- validar_checkout(reserva),
         {:ok, total_final} <- calcular_total_final(reserva),
         {:ok, _reserva} <- ReservaRepo.actualizar_estado(reserva_id, "checked_out"),
         {:ok, reserva} <- ReservaRepo.actualizar_total(reserva_id, total_final),
         {:ok, habitacion} <- HabitacionRepo.cambiar_estado(reserva.habitacion_id, "en_limpieza"),
         {:ok, tarea} <- asignar_limpieza(habitacion) do

      # Event Sourcing — registrar eventos inmutables
      registrar_eventos(reserva, habitacion, tarea, total_final, usuario, ip)

      # 🔥 Fan-out reactivo: UN evento → MÚLTIPLES destinos
      broadcast_checkout(reserva, habitacion, tarea, total_final)

      # Programar verificación de limpieza (alerta admin si no se completa en 45 min)
      LimpiezaTimeoutWorker.programar(tarea.id, habitacion.id)

      Logger.info("[CheckOut] Reserva #{reserva_id} — Total: #{total_final}")

      {:ok, %{
        reserva: reserva,
        habitacion: habitacion,
        tarea_limpieza: tarea,
        total_final: total_final
      }}
    else
      {:error, reason} ->
        Logger.warning("[CheckOut] Error: #{inspect(reason)}")
        {:error, reason}
    end
  end

  # Función PURA — valida si el checkout es posible
  defp validar_checkout(reserva) do
    if reserva.estado == "checked_in" do
      :ok
    else
      {:error, :estado_invalido}
    end
  end

  # Función PURA — calcula total (reserva + consumos)
  defp calcular_total_final(reserva) do
    consumos_total = ConsumoRepo.total_por_reserva(reserva.id)
    total = Decimal.add(reserva.total || Decimal.new(0), consumos_total)
    {:ok, total}
  end

  # Asigna tarea de limpieza al empleado con menos carga
  defp asignar_limpieza(habitacion) do
    case TareaRepo.empleado_con_menos_carga() do
      {:ok, empleado_id} ->
        TareaRepo.crear(%{
          habitacion_id: habitacion.id,
          empleado_id: empleado_id,
          estado: "pendiente"
        })

      {:error, :sin_empleados} ->
        # Crear tarea sin asignar
        TareaRepo.crear(%{
          habitacion_id: habitacion.id,
          estado: "pendiente"
        })
    end
  end

  # Event Sourcing — registro de eventos inmutables
  # HOF: Pipeline.mapear aplica la misma transformación a cada evento
  # Patrón: lista de eventos → lista de changesets → inserción en BD
  defp registrar_eventos(reserva, habitacion, tarea, total_final, usuario \\ nil, ip \\ nil) do
    [
      CheckoutRealizado.nuevo(reserva, total_final, usuario, ip),
      HabitacionLiberada.nuevo(habitacion, usuario, ip),
      LimpiezaAsignada.nuevo(tarea, usuario, ip)
    ]
    # HOF: mapear transforma cada evento en su changeset (función pura)
    |> Pipeline.mapear(fn evento ->
      Evento.changeset(%Evento{}, Map.from_struct(evento))
    end)
    # HOF: mapear inserta cada changeset (side effect controlado al final)
    |> Pipeline.mapear(&Repo.insert/1)
  end

  # 🔥 FAN-OUT REACTIVO — Un evento → múltiples destinos simultáneos
  defp broadcast_checkout(reserva, habitacion, tarea, total_final) do
    pubsub = HotelFlux.PubSub

    # 1. Recepción → Mapa SVG actualiza habitación a "en_limpieza"
    Phoenix.PubSub.broadcast(pubsub, "habitaciones", {
      :habitacion_actualizada,
      %{id: habitacion.id, numero: habitacion.numero, estado: "en_limpieza", piso: habitacion.piso}
    })

    # 2. Limpieza → Nueva tarea aparece en tablet del personal
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

    # 3. Dashboard → Métricas de ocupación se actualizan
    Phoenix.PubSub.broadcast(pubsub, "dashboard", {
      :checkout_realizado,
      %{
        reserva_id: reserva.id,
        total_final: to_string(total_final),
        habitacion_numero: habitacion.numero
      }
    })

    # 4. Notificaciones globales
    Phoenix.PubSub.broadcast(pubsub, "notificaciones", {
      :alerta,
      %{tipo: "checkout", mensaje: "Check-out: Hab. #{habitacion.numero}", nivel: "info"}
    })
  end
end
