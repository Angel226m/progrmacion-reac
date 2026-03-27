defmodule HotelFlux.Adapters.Repos.AnaliticaRepo do
  @moduledoc """
  Adaptador — Repositorio de consultas analíticas para dashboards.
  Provee métricas por período: día, semana, mes, trimestre, semestre, año.
  Optimizado con índices parciales y consultas eficientes.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.{Reserva, Consumo, Pago, TareaLimpieza, Habitacion}

  # ═══════════════════════════════════════════════════════════
  # MÉTRICAS DE OCUPACIÓN
  # ═══════════════════════════════════════════════════════════

  @doc "Porcentaje de ocupación actual"
  def ocupacion_actual do
    total = Repo.aggregate(from(h in Habitacion, where: h.eliminado == false), :count, :id)
    ocupadas = Repo.aggregate(
      from(h in Habitacion, where: h.estado == "ocupada" and h.eliminado == false),
      :count, :id
    )

    if total > 0, do: Float.round(ocupadas / total * 100, 1), else: 0.0
  end

  @doc "Historial de reservas por período"
  def reservas_por_periodo(periodo) do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)

    from(r in Reserva,
      where: r.inserted_at >= ^fecha_inicio and r.inserted_at <= ^fecha_fin,
      where: r.eliminado == false,
      group_by: fragment("DATE(inserted_at)"),
      select: %{
        fecha: fragment("DATE(inserted_at)"),
        total: count(r.id),
        confirmadas: fragment("COUNT(CASE WHEN estado = 'confirmada' THEN 1 END)"),
        canceladas: fragment("COUNT(CASE WHEN estado = 'cancelada' THEN 1 END)"),
        checked_in: fragment("COUNT(CASE WHEN estado = 'checked_in' THEN 1 END)"),
        checked_out: fragment("COUNT(CASE WHEN estado = 'checked_out' THEN 1 END)")
      },
      order_by: [asc: fragment("DATE(inserted_at)")]
    )
    |> Repo.all()
  end

  # ═══════════════════════════════════════════════════════════
  # MÉTRICAS DE INGRESOS
  # ═══════════════════════════════════════════════════════════

  @doc "Ingresos totales por período"
  def ingresos_por_periodo(periodo) do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)

    pagos = from(p in Pago,
      where: p.inserted_at >= ^fecha_inicio and p.inserted_at <= ^fecha_fin,
      where: p.estado == "completado" and p.eliminado == false,
      select: coalesce(sum(p.monto), 0)
    ) |> Repo.one() || Decimal.new(0)

    consumos = from(c in Consumo,
      where: c.inserted_at >= ^fecha_inicio and c.inserted_at <= ^fecha_fin,
      where: c.estado != "cancelado" and c.eliminado == false,
      select: coalesce(sum(c.total), 0)
    ) |> Repo.one() || Decimal.new(0)

    %{
      ingresos_reservas: pagos,
      ingresos_consumos: consumos,
      total: Decimal.add(pagos, consumos)
    }
  end

  @doc "Ingresos diarios desglosados para gráficos"
  def ingresos_diarios(periodo) do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)

    from(p in Pago,
      where: p.inserted_at >= ^fecha_inicio and p.inserted_at <= ^fecha_fin,
      where: p.estado == "completado" and p.eliminado == false,
      group_by: fragment("DATE(inserted_at)"),
      select: %{
        fecha: fragment("DATE(inserted_at)"),
        monto: sum(p.monto),
        cantidad: count(p.id)
      },
      order_by: [asc: fragment("DATE(inserted_at)")]
    )
    |> Repo.all()
  end

  # ═══════════════════════════════════════════════════════════
  # MÉTRICAS DE LIMPIEZA
  # ═══════════════════════════════════════════════════════════

  @doc "Métricas de limpieza por período"
  def metricas_limpieza(periodo) do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)

    from(t in TareaLimpieza,
      where: t.completada_en >= ^fecha_inicio and t.completada_en <= ^fecha_fin,
      where: t.estado == "completada" and t.eliminado == false,
      select: %{
        total_tareas: count(t.id),
        promedio_minutos: avg(t.duracion_minutos),
        minimo_minutos: min(t.duracion_minutos),
        maximo_minutos: max(t.duracion_minutos)
      }
    )
    |> Repo.one()
  end

  # ═══════════════════════════════════════════════════════════
  # MÉTRICAS DE PRODUCTOS
  # ═══════════════════════════════════════════════════════════

  @doc "Productos más vendidos por período"
  def productos_populares(periodo, limite \\ 10) do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)

    from(c in Consumo,
      join: p in HotelFlux.Domain.Producto, on: c.producto_id == p.id,
      where: c.inserted_at >= ^fecha_inicio and c.inserted_at <= ^fecha_fin,
      where: c.estado != "cancelado" and c.eliminado == false,
      group_by: [p.id, p.nombre, p.categoria],
      order_by: [desc: sum(c.cantidad)],
      select: %{
        producto_id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        cantidad_vendida: sum(c.cantidad),
        ingresos: sum(c.total)
      },
      limit: ^limite
    )
    |> Repo.all()
  end

  @doc "Ventas por categoría de producto"
  def ventas_por_categoria(periodo) do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)

    from(c in Consumo,
      join: p in HotelFlux.Domain.Producto, on: c.producto_id == p.id,
      where: c.inserted_at >= ^fecha_inicio and c.inserted_at <= ^fecha_fin,
      where: c.estado != "cancelado" and c.eliminado == false,
      group_by: p.categoria,
      select: %{
        categoria: p.categoria,
        cantidad: sum(c.cantidad),
        ingresos: sum(c.total)
      },
      order_by: [desc: sum(c.total)]
    )
    |> Repo.all()
  end

  @doc "Ventas de productos desglosadas por día/semana/mes"
  def ventas_producto_detalladas(periodo, granularidad \\ "dia") do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)
    agrupacion = fragmento_agrupacion(granularidad)

    from(c in Consumo,
      join: p in HotelFlux.Domain.Producto, on: c.producto_id == p.id,
      where: c.inserted_at >= ^fecha_inicio and c.inserted_at <= ^fecha_fin,
      where: c.estado != "cancelado" and c.eliminado == false,
      group_by: [p.categoria, fragment(^agrupacion)],
      select: %{
        periodo: fragment(^agrupacion),
        categoria: p.categoria,
        cantidad: sum(c.cantidad),
        ingresos: sum(c.total)
      },
      order_by: [asc: fragment(^agrupacion)]
    )
    |> Repo.all()
  end

  # ═══════════════════════════════════════════════════════════
  # MÉTRICAS DE HABITACIONES
  # ═══════════════════════════════════════════════════════════

  @doc "Habitaciones más reservadas por período"
  def habitaciones_mas_usadas(periodo, limite \\ 10) do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)

    from(r in Reserva,
      join: h in Habitacion, on: r.habitacion_id == h.id,
      where: r.inserted_at >= ^fecha_inicio and r.inserted_at <= ^fecha_fin,
      where: r.eliminado == false and r.estado != "cancelada",
      group_by: [h.id, h.numero, h.tipo, h.piso],
      order_by: [desc: count(r.id)],
      select: %{
        habitacion_id: h.id,
        numero: h.numero,
        tipo: h.tipo,
        piso: h.piso,
        total_reservas: count(r.id),
        ingresos_generados: coalesce(sum(r.total), 0)
      },
      limit: ^limite
    )
    |> Repo.all()
  end

  @doc "Tasa de ocupación por tipo de habitación"
  def ocupacion_por_tipo do
    from(h in Habitacion,
      where: h.eliminado == false,
      group_by: h.tipo,
      select: %{
        tipo: h.tipo,
        total: count(h.id),
        ocupadas: fragment("COUNT(CASE WHEN estado = 'ocupada' THEN 1 END)"),
        disponibles: fragment("COUNT(CASE WHEN estado = 'disponible' THEN 1 END)"),
        en_limpieza: fragment("COUNT(CASE WHEN estado = 'en_limpieza' THEN 1 END)"),
        mantenimiento: fragment("COUNT(CASE WHEN estado = 'mantenimiento' THEN 1 END)")
      }
    )
    |> Repo.all()
  end

  @doc "Ocupación histórica por día"
  def ocupacion_historica(periodo) do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)

    from(r in Reserva,
      where: r.eliminado == false and r.estado in ["checked_in", "checked_out"],
      where: r.fecha_entrada <= ^fecha_fin and r.fecha_salida >= ^fecha_inicio,
      group_by: fragment("generate_series(?::date, ?::date, '1 day'::interval)::date", ^fecha_inicio, ^fecha_fin),
      select: %{
        fecha: fragment("generate_series(?::date, ?::date, '1 day'::interval)::date", ^fecha_inicio, ^fecha_fin),
        ocupadas: count(r.id)
      },
      order_by: [asc: fragment("generate_series(?::date, ?::date, '1 day'::interval)::date", ^fecha_inicio, ^fecha_fin)]
    )
    |> Repo.all()
  end

  @doc "Ingresos por habitación"
  def ingresos_por_habitacion(periodo, limite \\ 10) do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)

    from(r in Reserva,
      join: h in Habitacion, on: r.habitacion_id == h.id,
      where: r.inserted_at >= ^fecha_inicio and r.inserted_at <= ^fecha_fin,
      where: r.eliminado == false and r.estado in ["checked_out"],
      group_by: [h.id, h.numero, h.tipo, h.piso],
      order_by: [desc: sum(r.total)],
      select: %{
        habitacion_id: h.id,
        numero: h.numero,
        tipo: h.tipo,
        piso: h.piso,
        total_reservas: count(r.id),
        ingresos: coalesce(sum(r.total), 0)
      },
      limit: ^limite
    )
    |> Repo.all()
  end

  # ═══════════════════════════════════════════════════════════
  # RESUMEN GENERAL DEL DASHBOARD
  # ═══════════════════════════════════════════════════════════

  @doc "Métricas completas del dashboard para un período"
  def metricas_dashboard(periodo) do
    %{
      ocupacion: ocupacion_actual(),
      ocupacion_por_tipo: ocupacion_por_tipo(),
      ingresos: ingresos_por_periodo(periodo),
      reservas: resumen_reservas(periodo),
      limpieza: metricas_limpieza(periodo),
      productos_populares: productos_populares(periodo, 5),
      habitaciones_mas_usadas: habitaciones_mas_usadas(periodo, 5)
    }
  end

  @doc "Resumen de reservas por período"
  def resumen_reservas(periodo) do
    {fecha_inicio, fecha_fin} = rango_periodo(periodo)

    from(r in Reserva,
      where: r.inserted_at >= ^fecha_inicio and r.inserted_at <= ^fecha_fin,
      where: r.eliminado == false,
      select: %{
        total: count(r.id),
        confirmadas: fragment("COUNT(CASE WHEN estado = 'confirmada' THEN 1 END)"),
        canceladas: fragment("COUNT(CASE WHEN estado = 'cancelada' THEN 1 END)"),
        checked_in: fragment("COUNT(CASE WHEN estado = 'checked_in' THEN 1 END)"),
        checked_out: fragment("COUNT(CASE WHEN estado = 'checked_out' THEN 1 END)")
      }
    )
    |> Repo.one()
  end

  # ═══════════════════════════════════════════════════════════
  # UTILIDADES DE RANGO DE PERÍODO
  # ═══════════════════════════════════════════════════════════

  @doc "Calcula el rango de fechas DateTime para un período dado"
  def rango_periodo("dia") do
    hoy = Date.utc_today()
    inicio = DateTime.new!(hoy, ~T[00:00:00], "Etc/UTC")
    fin = DateTime.new!(hoy, ~T[23:59:59], "Etc/UTC")
    {inicio, fin}
  end

  def rango_periodo("semana") do
    hoy = Date.utc_today()
    dia = Date.day_of_week(hoy)
    lunes = Date.add(hoy, -(dia - 1))
    domingo = Date.add(lunes, 6)
    {DateTime.new!(lunes, ~T[00:00:00], "Etc/UTC"), DateTime.new!(domingo, ~T[23:59:59], "Etc/UTC")}
  end

  def rango_periodo("mes") do
    hoy = Date.utc_today()
    inicio_mes = Date.beginning_of_month(hoy)
    fin_mes = Date.end_of_month(hoy)
    {DateTime.new!(inicio_mes, ~T[00:00:00], "Etc/UTC"), DateTime.new!(fin_mes, ~T[23:59:59], "Etc/UTC")}
  end

  def rango_periodo("trimestre") do
    hoy = Date.utc_today()
    mes_actual = hoy.month
    trimestre_inicio = div(mes_actual - 1, 3) * 3 + 1
    inicio = Date.new!(hoy.year, trimestre_inicio, 1)
    fin = Date.end_of_month(Date.new!(hoy.year, trimestre_inicio + 2, 1))
    {DateTime.new!(inicio, ~T[00:00:00], "Etc/UTC"), DateTime.new!(fin, ~T[23:59:59], "Etc/UTC")}
  end

  def rango_periodo("semestre") do
    hoy = Date.utc_today()
    if hoy.month <= 6 do
      {DateTime.new!(Date.new!(hoy.year, 1, 1), ~T[00:00:00], "Etc/UTC"),
       DateTime.new!(Date.new!(hoy.year, 6, 30), ~T[23:59:59], "Etc/UTC")}
    else
      {DateTime.new!(Date.new!(hoy.year, 7, 1), ~T[00:00:00], "Etc/UTC"),
       DateTime.new!(Date.new!(hoy.year, 12, 31), ~T[23:59:59], "Etc/UTC")}
    end
  end

  def rango_periodo("anual") do
    hoy = Date.utc_today()
    {DateTime.new!(Date.new!(hoy.year, 1, 1), ~T[00:00:00], "Etc/UTC"),
     DateTime.new!(Date.new!(hoy.year, 12, 31), ~T[23:59:59], "Etc/UTC")}
  end

  def rango_periodo(_), do: rango_periodo("dia")

  # ═══════════════════════════════════════════════════════════
  # HELPERS PRIVADOS
  # ═══════════════════════════════════════════════════════════

  defp fragmento_agrupacion("dia"), do: "DATE(inserted_at)"
  defp fragmento_agrupacion("semana"), do: "DATE_TRUNC('week', inserted_at)::date"
  defp fragmento_agrupacion("mes"), do: "DATE_TRUNC('month', inserted_at)::date"
  defp fragmento_agrupacion(_), do: "DATE(inserted_at)"
end
