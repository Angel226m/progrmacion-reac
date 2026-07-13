defmodule HotelFlux.Workers.LimpiezaTimeoutWorker do
  @moduledoc """
  Worker de Oban — Verificador de timeout de limpieza.

  Después de un checkout, se programa este job para verificar
  que la habitación fue limpiada dentro del tiempo límite (45 min).

  Si no fue completada:
    1. Notifica al administrador vía WebSocket (canal notificaciones)
    2. Escala el nivel de alerta ("critico" si supera el doble del timeout)
    3. Registra el evento de timeout en los logs

  Configuración:
    - Timeout: 45 minutos (configurable vía @timeout_minutos)
    - Reintentos: 3 (verifica cada 15 minutos si está en proceso)
    - Cola: limpieza
    - Jobs únicos: evita duplicados en 1 hora

  Demuestra: scheduling reactivo con Oban + broadcast de alertas en tiempo real.
  """

  use Oban.Worker,
    queue: :limpieza,
    max_attempts: 3,
    unique: [period: 3600, fields: [:args, :queue]]

  alias HotelFlux.Adapters.Repos.{TareaRepo, HabitacionRepo}

  require Logger

  @timeout_minutos 45

  @impl Oban.Worker
  # Punto de entrada: obtiene la tarea y verifica su estado según el intento actual
  def perform(%Oban.Job{args: %{"tarea_id" => tarea_id, "habitacion_id" => habitacion_id}, attempt: attempt}) do
    case TareaRepo.obtener(tarea_id) do
      {:ok, tarea} ->
        verificar_limpieza(tarea, habitacion_id, attempt)

      {:error, _} ->
        Logger.warning("[LimpiezaTimeout] Tarea #{tarea_id} no encontrada")
        :ok
    end
  end

  # Evalúa el estado de la tarea: completada, en proceso (reintenta) o timeout
  defp verificar_limpieza(tarea, habitacion_id, attempt) do
    case tarea.estado do
      "completada" ->
        Logger.info("[LimpiezaTimeout] Tarea #{tarea.id} ya completada ✓")
        :ok

      "en_proceso" when attempt < 3 ->
        Logger.info("[LimpiezaTimeout] Tarea #{tarea.id} en proceso, reintentando...")
        {:snooze, 900} # Reintenta en 15 minutos

      _ ->
        minutos_transcurridos = calcular_minutos(tarea.inserted_at)
        nivel = nivel_alerta(minutos_transcurridos)

        notificar_admin(tarea, habitacion_id, minutos_transcurridos, nivel)
        :ok
    end
  end

  # Define el nivel de alerta: "critico" si supera el doble del timeout
  defp nivel_alerta(minutos) when minutos > @timeout_minutos * 2, do: "critico"
  defp nivel_alerta(_), do: "warning"

  # Calcula los minutos transcurridos desde la creación de la tarea
  defp calcular_minutos(inserted_at) do
    NaiveDateTime.diff(NaiveDateTime.utc_now(), inserted_at, :second)
    |> div(60)
  end

  # Notifica a los canales de notificaciones y dashboard sobre la alerta
  defp notificar_admin(tarea, habitacion_id, minutos, nivel) do
    habitacion_info = case HabitacionRepo.obtener(habitacion_id) do
      {:ok, h} -> "Hab. #{h.numero} (Piso #{h.piso})"
      _ -> "Hab. ID #{habitacion_id}"
    end

    mensaje = "Limpieza pendiente: #{habitacion_info} — #{minutos} min sin completar"

    # Alerta en el canal de notificaciones
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "notificaciones", {
      :alerta,
      %{
        tipo: "limpieza_timeout",
        mensaje: mensaje,
        nivel: nivel,
        tarea_id: tarea.id,
        habitacion_id: habitacion_id,
        minutos_transcurridos: minutos
      }
    })

    # Alerta en el canal del dashboard
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "dashboard", {
      :alerta_limpieza,
      %{
        tarea_id: tarea.id,
        habitacion_id: habitacion_id,
        minutos: minutos,
        nivel: nivel
      }
    })

    Logger.warning("[LimpiezaTimeout] ALERTA #{nivel}: #{mensaje}")
  end

  @doc "Programa la verificación de limpieza programada para después del checkout."
  def programar(tarea_id, habitacion_id) do
    %{"tarea_id" => tarea_id, "habitacion_id" => habitacion_id}
    |> __MODULE__.new(schedule_in: @timeout_minutos * 60)
  end
end
