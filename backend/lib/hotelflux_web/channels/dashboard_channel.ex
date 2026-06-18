defmodule HotelFluxWeb.DashboardChannel do
  @moduledoc """
  Canal WebSocket reactivo — Stream de métricas gerenciales.

  Múltiples streams independientes fusionados:
  - Ocupación (se actualiza con cada check-in/out)
  - Ingresos del día (cada venta/reserva)
  - Tiempos de limpieza (promedio con ventana deslizante)
  - Alertas activas

  Demuestra:
  - HOF: `calcular_metricas/0` agrega datos con pipelines funcionales internos,
    aunque el cómputo global es impuro (consulta DB en cada invocación)
  - Pipeline funcional: `proyectar_ocupacion/1` aplica reducción a eventos
  - Inmutabilidad: estado del dashboard como mapa inmutable
  - Fan-out reactivo: un evento → múltiples destinos
  """
  use Phoenix.Channel

  import Ecto.Query, warn: false

  alias HotelFlux.Adapters.Repos.{HabitacionRepo, TareaRepo, ConsumoRepo, ReservaRepo}
  alias HotelFlux.Domain.{Evento, Pipeline}

  @impl true
  def join("dashboard:live", _params, socket) do
    if socket.assigns.rol in ["admin", "gerente"] do
      Phoenix.PubSub.subscribe(HotelFlux.PubSub, "dashboard")
      Phoenix.PubSub.subscribe(HotelFlux.PubSub, "habitaciones")

      # Enviar métricas iniciales inmediatamente después de unirse
      send(self(), :after_join)
      {:ok, socket}
    else
      {:error, %{reason: "Solo gerentes y admin"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    push(socket, "metricas_actualizadas", calcular_metricas())
    {:noreply, socket}
  end

  def handle_info({:checkin_realizado, data}, socket) do
    push(socket, "checkin", data)
    push(socket, "metricas_actualizadas", calcular_metricas())
    {:noreply, socket}
  end

  def handle_info({:checkout_realizado, data}, socket) do
    push(socket, "checkout", data)
    push(socket, "metricas_actualizadas", calcular_metricas())
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

  @impl true
  def handle_in("refresh_metricas", _params, socket) do
    {:reply, {:ok, calcular_metricas()}, socket}
  end

  @doc """
  Proyecta el estado de ocupación desde una lista de eventos del dominio.
  HOF: recibe `proyeccion` como función — Evento.proyectar/3 (recursivo).

  Demuestra la diferencia entre estado calculado (from scratch) vs
  proyección (fold sobre historial de eventos).
  """
  def handle_in("proyectar_ocupacion", %{"desde" => desde_str}, socket) do
    desde =
      case DateTime.from_iso8601(desde_str) do
        {:ok, dt, _} -> dt
        _ -> DateTime.add(DateTime.utc_now(), -3600, :second)
      end

    # HOF: filtrar con predicado generado por Evento.para_tipo
    checkins_pred = Evento.para_tipo("checkin_realizado")
    checkouts_pred = Evento.para_tipo("checkout_realizado")

    eventos = HotelFlux.Repo.all(
      from e in Evento,
      where: e.ocurrido_en >= ^desde,
      order_by: [asc: e.ocurrido_en]
    )

    # HOF + RECURSIÓN: Evento.proyectar usa recursión de cola
    ocupacion_proyectada =
      Evento.proyectar(
        eventos,
        fn estado, evento ->
          cond do
            checkins_pred.(evento) -> %{estado | ocupadas: estado.ocupadas + 1}
            checkouts_pred.(evento) -> %{estado | ocupadas: max(0, estado.ocupadas - 1)}
            true -> estado
          end
        end,
        %{ocupadas: 0, checkouts_hoy: 0, checkins_hoy: 0}
      )

    {:reply, {:ok, %{proyeccion: ocupacion_proyectada}}, socket}
  end

  # Cálculo de métricas — función IMPURA (consulta DB en cada invocación)
  # aunque internamente usa pipelines funcionales (|>, Map.values, etc.)
  defp calcular_metricas do
    habitaciones_por_estado = HabitacionRepo.contar_por_estado()

    # Pipeline funcional con |> (composición)
    total_habitaciones =
      habitaciones_por_estado
      |> Map.values()
      |> Pipeline.reducir(fn acc, v -> acc + v end, 0)

    ocupadas      = Map.get(habitaciones_por_estado, "ocupada",        0)
    disponibles   = Map.get(habitaciones_por_estado, "disponible",     0)
    en_limpieza   = Map.get(habitaciones_por_estado, "en_limpieza",    0)
    en_mant       = Map.get(habitaciones_por_estado, "mantenimiento",  0)
    reservadas    = Map.get(habitaciones_por_estado, "reservada",      0)

    # Función pura: división segura
    ocupacion =
      if total_habitaciones > 0,
        do: Float.round(ocupadas / total_habitaciones * 100, 1),
        else: 0.0

    reservas_del_dia = ReservaRepo.reservas_del_dia()
    checkins_hoy  = Enum.count(reservas_del_dia, fn r -> r.estado == "checked_in" end)
    checkouts_hoy = Enum.count(reservas_del_dia, fn r -> r.estado == "checked_out" end)

    %{
      total_habitaciones:  total_habitaciones,
      disponibles:         disponibles,
      ocupadas:            ocupadas,
      en_limpieza:         en_limpieza,
      en_mantenimiento:    en_mant,
      reservadas:          reservadas,
      porcentaje_ocupacion: ocupacion,
      ingresos_hoy:        to_string(ConsumoRepo.ingresos_hoy()),
      checkins_hoy:        checkins_hoy,
      checkouts_hoy:       checkouts_hoy,
      promedio_limpieza_min: TareaRepo.promedio_limpieza_24h(),
      timestamp:           DateTime.utc_now()
    }
  end
end
