defmodule HotelFlux.Workers.LimpiezaTimeoutWorker do
  @moduledoc """
  Oban Worker — Verificador de timeout de limpieza.

  Después de un checkout, se programa este job para verificar
  que la habitación fue limpiada dentro del tiempo límite.

  Si no fue completada:
    1. Notifica al admin vía WebSocket (canal notificaciones)
    2. Escala la alerta (nivel "critico")
    3. Registra evento de timeout

  Configuración:
    - Timeout: 45 minutos (configurable)
    - Reintentos: 3 (verifica cada cierto tiempo)
    - Cola: limpieza

  Demuestra: scheduling reactivo con Oban + broadcast de alertas.
  """
  use Oban.Worker,
    queue: :limpieza,
    max_attempts: 3,
    unique: [period: 3600, fields: [:args, :queue]]

  alias HotelFlux.Adapters.Repos.{TareaRepo, HabitacionRepo}

  require Logger

  @timeout_minutos 45

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"tarea_id" => tarea_id, "habitacion_id" => habitacion_id}, attempt: attempt}) do
    case TareaRepo.obtener(tarea_id) do
      {:ok, tarea} ->
        verificar_limpieza(tarea, habitacion_id, attempt)

      {:error, _} ->
        Logger.warning("[LimpiezaTimeout] Tarea #{tarea_id} no encontrada")
        :ok
    end
  end

  defp verificar_limpieza(tarea, habitacion_id, attempt) do
    case tarea.estado do
      "completada" ->
        Logger.info("[LimpiezaTimeout] Tarea #{tarea.id} ya completada ✓")
        :ok

      "en_proceso" when attempt < 3 ->
        Logger.info("[LimpiezaTimeout] Tarea #{tarea.id} en proceso, reintentando...")
        {:snooze, 900}

      _ ->
        minutos_transcurridos = calcular_minutos(tarea.inserted_at)
        nivel = nivel_alerta(minutos_transcurridos)

        notificar_admin(tarea, habitacion_id, minutos_transcurridos, nivel)
        :ok
    end
  end

  defp nivel_alerta(minutos) when minutos > @timeout_minutos * 2, do: "critico"
  defp nivel_alerta(_), do: "warning"

  defp calcular_minutos(inserted_at) do
    NaiveDateTime.diff(NaiveDateTime.utc_now(), inserted_at, :second)
    |> div(60)
  end

  defp notificar_admin(tarea, habitacion_id, minutos, nivel) do
    habitacion_info = case HabitacionRepo.obtener(habitacion_id) do
      {:ok, h} -> "Hab. #{h.numero} (Piso #{h.piso})"
      _ -> "Hab. ID #{habitacion_id}"
    end

    mensaje = "⚠️ Limpieza pendiente: #{habitacion_info} — #{minutos} min sin completar"

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

  @doc "Programa verificación de limpieza post-checkout."
  def programar(tarea_id, habitacion_id) do
    %{"tarea_id" => tarea_id, "habitacion_id" => habitacion_id}
    |> __MODULE__.new(schedule_in: @timeout_minutos * 60)
  end
end
