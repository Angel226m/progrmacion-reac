defmodule HotelFluxWeb.MetricsController do
  @moduledoc """
  Expone métricas en formato Prometheus text (version 0.0.4).
  Endpoint GET /metrics — sin autenticación (estándar industria scraping interno).

  Métricas expuestas:
    - Sistema:  memoria Erlang VM, procesos, schedulers, ports
    - Hotel:    habitaciones por estado, ocupación %, pisos
    - Negocio:  check-ins/outs del día, ingresos día/mes, ingresos por método pago
    - Reservas: por estado, pendientes de hoy
    - Limpieza: pendientes, en progreso, completadas, duración promedio
    - Huéspedes: total registrados, activos (con check-in)
    - HTTP:     request rate total, latencia promedio
  """
  use Phoenix.Controller

  alias HotelFlux.Repo
  alias HotelFlux.Domain.{Habitacion, Reserva, Pago, Huesped, TareaLimpieza}
  import Ecto.Query

  def index(conn, _params) do
    metrics_text = build_metrics()

    conn
    |> put_resp_content_type("text/plain; version=0.0.4; charset=utf-8")
    |> put_resp_header("cache-control", "no-store, no-cache")
    |> send_resp(200, metrics_text)
  rescue
    _ ->
      conn
      |> put_resp_content_type("text/plain; version=0.0.4; charset=utf-8")
      |> send_resp(200, system_metrics_only())
  end

  # ─── Construcción completa de métricas ───────────────────

  defp build_metrics do
    [
      system_metrics(),
      hotel_metrics(),
      business_metrics(),
      reservation_metrics(),
      cleaning_metrics(),
      guest_metrics(),
      http_metrics()
    ]
    |> Enum.join("\n")
  end

  defp system_metrics_only, do: system_metrics()

  # ─── Erlang VM ───────────────────────────────────────────

  defp system_metrics do
    mem    = :erlang.memory()
    procs  = :erlang.system_info(:process_count)
    scheds = :erlang.system_info(:schedulers_online)
    ports  = :erlang.system_info(:port_count)
    run_q  = :erlang.statistics(:run_queue)
    {wall_ms, _} = :erlang.statistics(:wall_clock)
    uptime_s = div(wall_ms, 1000)

    """
    # HELP hotelflux_up Backend HotelFlux activo (1 = en línea)
    # TYPE hotelflux_up gauge
    hotelflux_up 1
    # HELP hotelflux_uptime_seconds Segundos de uptime del backend
    # TYPE hotelflux_uptime_seconds counter
    hotelflux_uptime_seconds #{uptime_s}
    # HELP hotelflux_erlang_memory_bytes Uso de memoria de la VM Erlang por tipo
    # TYPE hotelflux_erlang_memory_bytes gauge
    hotelflux_erlang_memory_bytes{type="total"}     #{mem[:total]}
    hotelflux_erlang_memory_bytes{type="processes"} #{mem[:processes]}
    hotelflux_erlang_memory_bytes{type="system"}    #{mem[:system]}
    hotelflux_erlang_memory_bytes{type="ets"}       #{mem[:ets]}
    hotelflux_erlang_memory_bytes{type="atom"}      #{mem[:atom]}
    hotelflux_erlang_memory_bytes{type="binary"}    #{mem[:binary]}
    # HELP hotelflux_erlang_process_count Procesos Erlang activos
    # TYPE hotelflux_erlang_process_count gauge
    hotelflux_erlang_process_count #{procs}
    # HELP hotelflux_erlang_schedulers_online Schedulers Erlang en línea
    # TYPE hotelflux_erlang_schedulers_online gauge
    hotelflux_erlang_schedulers_online #{scheds}
    # HELP hotelflux_erlang_port_count Puertos Erlang abiertos
    # TYPE hotelflux_erlang_port_count gauge
    hotelflux_erlang_port_count #{ports}
    # HELP hotelflux_erlang_run_queue Procesos en cola de ejecución (saturación)
    # TYPE hotelflux_erlang_run_queue gauge
    hotelflux_erlang_run_queue #{run_q}
    """
  end

  # ─── Habitaciones ────────────────────────────────────────

  defp hotel_metrics do
    total         = Repo.aggregate(Habitacion, :count, :id) || 0
    disponibles   = count_rooms("disponible")
    ocupadas      = count_rooms("ocupada")
    reservadas    = count_rooms("reservada")
    limpieza      = count_rooms("en_limpieza")
    mantenimiento = count_rooms("en_mantenimiento")
    bloqueadas    = count_rooms("bloqueada")
    tasa = if total > 0, do: Float.round(ocupadas / total * 100, 2), else: 0.0

    # Pisos únicos — habitaciones disponibles por piso
    pisos_disponibles =
      Repo.all(
        from h in Habitacion,
          where: h.estado == "disponible",
          group_by: h.piso,
          select: {h.piso, count(h.id)}
      )

    pisos_lines =
      Enum.map_join(pisos_disponibles, "\n", fn {piso, cnt} ->
        ~s(hotelflux_rooms_available_by_floor{floor="#{piso}"} #{cnt})
      end)

    """
    # HELP hotelflux_rooms_total Total de habitaciones del hotel
    # TYPE hotelflux_rooms_total gauge
    hotelflux_rooms_total #{total}
    # HELP hotelflux_rooms_by_state Habitaciones agrupadas por estado
    # TYPE hotelflux_rooms_by_state gauge
    hotelflux_rooms_by_state{state="disponible"}      #{disponibles}
    hotelflux_rooms_by_state{state="ocupada"}         #{ocupadas}
    hotelflux_rooms_by_state{state="reservada"}       #{reservadas}
    hotelflux_rooms_by_state{state="en_limpieza"}     #{limpieza}
    hotelflux_rooms_by_state{state="mantenimiento"}   #{mantenimiento}
    hotelflux_rooms_by_state{state="bloqueada"}       #{bloqueadas}
    # HELP hotelflux_occupancy_rate_percent Tasa de ocupación del hotel (%)
    # TYPE hotelflux_occupancy_rate_percent gauge
    hotelflux_occupancy_rate_percent #{tasa}
    # HELP hotelflux_rooms_available_by_floor Habitaciones disponibles por piso
    # TYPE hotelflux_rooms_available_by_floor gauge
    #{pisos_lines}
    """
  end

  defp count_rooms(estado) do
    Repo.aggregate(from(h in Habitacion, where: h.estado == ^estado), :count, :id) || 0
  end

  # ─── Negocio / Ingresos ──────────────────────────────────

  defp business_metrics do
    hoy = Date.utc_today()
    inicio_mes = %{hoy | day: 1}

    checkins_hoy = Repo.aggregate(
      from(r in Reserva,
        where: r.estado == "checked_in" and r.fecha_entrada == ^hoy),
      :count, :id
    ) || 0

    checkouts_hoy = Repo.aggregate(
      from(r in Reserva,
        where: r.estado == "checked_out" and r.fecha_salida == ^hoy),
      :count, :id
    ) || 0

    ingresos_hoy_cents  = ingresos_centavos(hoy, hoy)
    ingresos_mes_cents  = ingresos_centavos(inicio_mes, hoy)

    # Ingresos por método de pago (mes actual)
    ingresos_por_metodo =
      Repo.all(
        from p in Pago,
          join: r in Reserva, on: p.reserva_id == r.id,
          where: p.estado == "completado"
            and r.fecha_salida >= ^inicio_mes
            and r.fecha_salida <= ^hoy,
          group_by: p.metodo_pago,
          select: {p.metodo_pago, coalesce(sum(p.monto), ^Decimal.new("0"))}
      )

    metodo_lines =
      Enum.map_join(ingresos_por_metodo, "\n", fn {metodo, monto} ->
        cents = monto |> Decimal.to_float() |> Kernel.*(100) |> round()
        ~s(hotelflux_revenue_by_method_cents{method="#{metodo || "desconocido"}"} #{cents})
      end)

    """
    # HELP hotelflux_checkins_today Check-ins realizados hoy (fuente: BD)
    # TYPE hotelflux_checkins_today gauge
    hotelflux_checkins_today #{checkins_hoy}
    # HELP hotelflux_checkouts_today Check-outs realizados hoy (fuente: BD)
    # TYPE hotelflux_checkouts_today gauge
    hotelflux_checkouts_today #{checkouts_hoy}
    # HELP hotelflux_revenue_today_cents Ingresos de hoy en centavos (fuente: BD)
    # TYPE hotelflux_revenue_today_cents gauge
    hotelflux_revenue_today_cents #{ingresos_hoy_cents}
    # HELP hotelflux_revenue_month_cents Ingresos del mes en centavos (fuente: BD)
    # TYPE hotelflux_revenue_month_cents gauge
    hotelflux_revenue_month_cents #{ingresos_mes_cents}
    # HELP hotelflux_revenue_by_method_cents Ingresos del mes por método de pago
    # TYPE hotelflux_revenue_by_method_cents gauge
    #{metodo_lines}
    """
  end

  defp ingresos_centavos(desde, hasta) do
    result = Repo.one(
      from p in Pago,
        join: r in Reserva, on: p.reserva_id == r.id,
        where: p.estado == "completado"
          and r.fecha_salida >= ^desde
          and r.fecha_salida <= ^hasta,
        select: coalesce(sum(p.monto), ^Decimal.new("0"))
    )
    result |> Decimal.to_float() |> Kernel.*(100) |> round()
  rescue
    _ -> 0
  end

  # ─── Reservas ────────────────────────────────────────────

  defp reservation_metrics do
    hoy = Date.utc_today()

    activas      = count_reservations(["confirmada", "checked_in"])
    confirmadas  = count_reservations(["confirmada"])
    checked_in   = count_reservations(["checked_in"])
    pendientes   = count_reservations(["pendiente"])
    canceladas_hoy = Repo.aggregate(
      from(r in Reserva,
        where: r.estado == "cancelada"
          and fragment("DATE(?)", r.updated_at) == ^hoy),
      :count, :id
    ) || 0

    # Entradas de hoy sin check-in aún
    entradas_pendientes = Repo.aggregate(
      from(r in Reserva,
        where: r.estado == "confirmada" and r.fecha_entrada == ^hoy),
      :count, :id
    ) || 0

    salidas_pendientes = Repo.aggregate(
      from(r in Reserva,
        where: r.estado == "checked_in" and r.fecha_salida == ^hoy),
      :count, :id
    ) || 0

    """
    # HELP hotelflux_reservations_active Reservas activas (confirmadas + checked_in)
    # TYPE hotelflux_reservations_active gauge
    hotelflux_reservations_active #{activas}
    # HELP hotelflux_reservations_by_state Reservas agrupadas por estado (fuente: BD)
    # TYPE hotelflux_reservations_by_state gauge
    hotelflux_reservations_by_state{state="confirmada"}  #{confirmadas}
    hotelflux_reservations_by_state{state="checked_in"}  #{checked_in}
    hotelflux_reservations_by_state{state="pendiente"}   #{pendientes}
    # HELP hotelflux_reservations_cancelled_today Cancelaciones registradas hoy
    # TYPE hotelflux_reservations_cancelled_today gauge
    hotelflux_reservations_cancelled_today #{canceladas_hoy}
    # HELP hotelflux_checkins_pending_today Entradas de hoy aún sin check-in
    # TYPE hotelflux_checkins_pending_today gauge
    hotelflux_checkins_pending_today #{entradas_pendientes}
    # HELP hotelflux_checkouts_pending_today Salidas de hoy aún en casa
    # TYPE hotelflux_checkouts_pending_today gauge
    hotelflux_checkouts_pending_today #{salidas_pendientes}
    """
  end

  defp count_reservations(estados) do
    Repo.aggregate(from(r in Reserva, where: r.estado in ^estados), :count, :id) || 0
  end

  # ─── Limpieza ────────────────────────────────────────────

  defp cleaning_metrics do
    hoy = Date.utc_today()

    pendientes   = count_tasks("pendiente")
    en_progreso  = count_tasks("en_progreso")
    completadas_hoy = Repo.aggregate(
      from(t in TareaLimpieza,
        where: t.estado == "completada"
          and fragment("DATE(?)", t.updated_at) == ^hoy),
      :count, :id
    ) || 0

    # Duración promedio de tareas completadas hoy (en minutos)
    avg_duration =
      Repo.one(
        from t in TareaLimpieza,
          where: t.estado == "completada"
            and fragment("DATE(?)", t.updated_at) == ^hoy
            and not is_nil(t.iniciada_en)
            and not is_nil(t.completada_en),
          select: avg(
            fragment("EXTRACT(EPOCH FROM (? - ?)) / 60",
              t.completada_en, t.iniciada_en)
          )
      )

    avg_min = if avg_duration, do: avg_duration |> Decimal.to_float() |> Float.round(1), else: 0.0

    # Tareas asignadas por turno/prioridad
    por_prioridad =
      Repo.all(
        from t in TareaLimpieza,
          where: t.estado in ["pendiente", "en_progreso"],
          group_by: t.prioridad,
          select: {t.prioridad, count(t.id)}
      )

    prioridad_lines =
      Enum.map_join(por_prioridad, "\n", fn {prio, cnt} ->
        prio_str = prio || "normal"
        ~s(hotelflux_cleaning_pending_by_priority{priority="#{prio_str}"} #{cnt})
      end)

    """
    # HELP hotelflux_cleaning_tasks_pending Tareas de limpieza pendientes (fuente: BD)
    # TYPE hotelflux_cleaning_tasks_pending gauge
    hotelflux_cleaning_tasks_pending #{pendientes}
    # HELP hotelflux_cleaning_tasks_in_progress Tareas de limpieza en progreso
    # TYPE hotelflux_cleaning_tasks_in_progress gauge
    hotelflux_cleaning_tasks_in_progress #{en_progreso}
    # HELP hotelflux_cleaning_tasks_completed_today Tareas completadas hoy
    # TYPE hotelflux_cleaning_tasks_completed_today gauge
    hotelflux_cleaning_tasks_completed_today #{completadas_hoy}
    # HELP hotelflux_cleaning_avg_duration_minutes Duración promedio de limpieza hoy (min)
    # TYPE hotelflux_cleaning_avg_duration_minutes gauge
    hotelflux_cleaning_avg_duration_minutes #{avg_min}
    # HELP hotelflux_cleaning_pending_by_priority Tareas pendientes por prioridad
    # TYPE hotelflux_cleaning_pending_by_priority gauge
    #{prioridad_lines}
    """
  end

  defp count_tasks(estado) do
    Repo.aggregate(from(t in TareaLimpieza, where: t.estado == ^estado), :count, :id) || 0
  end

  # ─── Huéspedes ───────────────────────────────────────────

  defp guest_metrics do
    total_registrados = Repo.aggregate(Huesped, :count, :id) || 0

    activos = Repo.aggregate(
      from(h in Huesped,
        join: r in Reserva, on: r.huesped_id == h.id,
        where: r.estado == "checked_in"),
      :count, h.id
    ) || 0

    # Huéspedes nuevos registrados hoy
    hoy = Date.utc_today()
    nuevos_hoy = Repo.aggregate(
      from(h in Huesped,
        where: fragment("DATE(?)", h.inserted_at) == ^hoy),
      :count, :id
    ) || 0

    """
    # HELP hotelflux_guests_total Total de huéspedes registrados en BD
    # TYPE hotelflux_guests_total gauge
    hotelflux_guests_total #{total_registrados}
    # HELP hotelflux_guests_active Huéspedes actualmente con check-in
    # TYPE hotelflux_guests_active gauge
    hotelflux_guests_active #{activos}
    # HELP hotelflux_guests_new_today Nuevos huéspedes registrados hoy
    # TYPE hotelflux_guests_new_today gauge
    hotelflux_guests_new_today #{nuevos_hoy}
    """
  end

  # ─── Telemetría HTTP (Phoenix Telemetry) ─────────────────

  defp http_metrics do
    # Leemos del ETS del telemetry_metrics si están disponibles,
    # de lo contrario devolvemos ceros como fallback seguro
    {req_total, req_errors, req_p95_ms} =
      case :ets.whereis(:hotelflux_http_metrics) do
        :undefined ->
          {0, 0, 0}
        tid ->
          total  = safe_ets_lookup(tid, :total, 0)
          errors = safe_ets_lookup(tid, :errors, 0)
          p95    = safe_ets_lookup(tid, :p95_ms, 0)
          {total, errors, p95}
      end

    """
    # HELP hotelflux_http_requests_total Peticiones HTTP procesadas (acumulado)
    # TYPE hotelflux_http_requests_total counter
    hotelflux_http_requests_total #{req_total}
    # HELP hotelflux_http_errors_total Peticiones HTTP con status 5xx
    # TYPE hotelflux_http_errors_total counter
    hotelflux_http_errors_total #{req_errors}
    # HELP hotelflux_http_p95_duration_ms Latencia p95 HTTP en ms (ventana 5min)
    # TYPE hotelflux_http_p95_duration_ms gauge
    hotelflux_http_p95_duration_ms #{req_p95_ms}
    """
  end

  defp safe_ets_lookup(tid, key, default) do
    case :ets.lookup(tid, key) do
      [{^key, val}] -> val
      _ -> default
    end
  rescue
    _ -> default
  end
end
