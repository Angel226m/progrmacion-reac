defmodule HotelFluxWeb.DashboardChannel do
  @moduledoc """
  Canal WebSocket reactivo — Stream de métricas gerenciales.

  Múltiples streams independientes fusionados:
  - Ocupación (se actualiza con cada check-in/out)
  - Ingresos del día (cada venta/reserva)
  - Tiempos de limpieza (promedio con ventana deslizante)
  - Alertas activas

  Demuestra: combineLatest conceptual, múltiples streams fusionados.
  """
  use Phoenix.Channel

  alias HotelFlux.Adapters.Repos.{HabitacionRepo, TareaRepo, ConsumoRepo, ReservaRepo}

  @impl true
  def join("dashboard:live", _params, socket) do
    if socket.assigns.rol in ["admin", "gerente"] do
      Phoenix.PubSub.subscribe(HotelFlux.PubSub, "dashboard")
      Phoenix.PubSub.subscribe(HotelFlux.PubSub, "habitaciones")

      # Enviar estado inicial del dashboard
      metricas = calcular_metricas()
      {:ok, %{metricas: metricas}, socket}
    else
      {:error, %{reason: "Solo gerentes y admin"}}
    end
  end

  # Cada evento actualiza las métricas del dashboard
  @impl true
  def handle_info({:checkin_realizado, data}, socket) do
    push(socket, "checkin", data)
    push(socket, "metricas_update", calcular_metricas())
    {:noreply, socket}
  end

  def handle_info({:checkout_realizado, data}, socket) do
    push(socket, "checkout", data)
    push(socket, "metricas_update", calcular_metricas())
    {:noreply, socket}
  end

  def handle_info({:venta_realizada, data}, socket) do
    push(socket, "venta", data)
    push(socket, "ingresos_update", %{ingresos_hoy: to_string(ConsumoRepo.ingresos_hoy())})
    {:noreply, socket}
  end

  def handle_info({:limpieza_actualizada, data}, socket) do
    push(socket, "limpieza_update", data)
    promedio = TareaRepo.promedio_limpieza_24h()
    push(socket, "tiempo_limpieza_update", %{promedio_minutos: promedio})
    {:noreply, socket}
  end

  def handle_info({:habitacion_actualizada, data}, socket) do
    push(socket, "habitacion_update", data)
    {:noreply, socket}
  end

  # El frontend puede solicitar métricas actualizadas
  @impl true
  def handle_in("refresh_metricas", _params, socket) do
    metricas = calcular_metricas()
    {:reply, {:ok, metricas}, socket}
  end

  # Cálculo funcional de métricas — función PURA de agregación
  defp calcular_metricas do
    habitaciones_por_estado = HabitacionRepo.contar_por_estado()
    total_habitaciones = habitaciones_por_estado |> Map.values() |> Enum.sum()
    ocupadas = Map.get(habitaciones_por_estado, "ocupada", 0)

    ocupacion = if total_habitaciones > 0 do
      Float.round(ocupadas / total_habitaciones * 100, 1)
    else
      0.0
    end

    %{
      ocupacion_porcentaje: ocupacion,
      habitaciones_por_estado: habitaciones_por_estado,
      total_habitaciones: total_habitaciones,
      ingresos_hoy: to_string(ConsumoRepo.ingresos_hoy()),
      promedio_limpieza_min: TareaRepo.promedio_limpieza_24h(),
      reservas_hoy: length(ReservaRepo.reservas_del_dia()),
      timestamp: DateTime.utc_now()
    }
  end
end
