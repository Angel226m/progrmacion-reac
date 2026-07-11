defmodule HotelFluxWeb.AdminController do
  @moduledoc """
  Controlador de administración — Solo accesible por admin/gerente.
  Gestión completa de:
    - Pisos (CRUD + soft delete)
    - Habitaciones (CRUD + soft delete + clasificación)
    - Personal (CRUD + soft delete + horarios)
    - Dashboard analítico (día/semana/mes/trimestre/semestre/año)
    - Exportación de datos a Excel (CSV)
  """
  use Phoenix.Controller

  alias HotelFlux.Adapters.Repos.{
    PisoRepo, HabitacionRepo, UsuarioRepo,
    TurnoRepo, HorarioRepo, AnaliticaRepo
  }
  alias HotelFlux.Adapters.Cache.RedisCache

  require Logger

  # ═══════════════════════════════════════════════════════════
  # GESTIÓN DE PISOS
  # ═══════════════════════════════════════════════════════════

  @doc "GET /admin/pisos — Listar todos los pisos"
  def listar_pisos(conn, _params) do
    pisos = PisoRepo.listar()
    conn |> json(%{data: Enum.map(pisos, &serializar_piso/1)})
  end

  @doc "POST /admin/pisos — Crear un nuevo piso"
  def crear_piso(conn, params) do
    case PisoRepo.crear(params) do
      {:ok, piso} ->
        Logger.info("[Admin] Piso #{piso.numero} creado")
        conn |> put_status(201) |> json(%{ok: true, piso: serializar_piso(piso)})
      {:error, changeset} ->
        conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
    end
  end

  @doc "PUT /admin/pisos/:id — Actualizar un piso"
  def actualizar_piso(conn, %{"id" => id} = params) do
    case PisoRepo.actualizar(id, params) do
      {:ok, piso} ->
        conn |> json(%{ok: true, piso: serializar_piso(piso)})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  @doc "DELETE /admin/pisos/:id — Eliminar piso (soft delete)"
  def eliminar_piso(conn, %{"id" => id}) do
    case PisoRepo.eliminar(id) do
      {:ok, _piso} ->
        Logger.info("[Admin] Piso #{id} eliminado (soft delete)")
        conn |> json(%{ok: true, mensaje: "Piso eliminado correctamente"})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  # ═══════════════════════════════════════════════════════════
  # GESTIÓN DE HABITACIONES (CRUD completo)
  # ═══════════════════════════════════════════════════════════

  @doc "PUT /admin/habitaciones/:id — Actualizar habitación"
  def actualizar_habitacion(conn, %{"id" => id} = params) do
    case HabitacionRepo.obtener(id) do
      {:ok, habitacion} ->
        changeset = HotelFlux.Domain.Habitacion.changeset(habitacion, params)
        case HotelFlux.Repo.update(changeset) do
          {:ok, hab_actualizada} ->
            broadcast_habitacion(hab_actualizada)
            conn |> json(%{ok: true, habitacion: serializar_habitacion(hab_actualizada)})
          {:error, changeset} ->
            conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
        end
      {:error, _} ->
        conn |> put_status(404) |> json(%{error: "Habitación no encontrada"})
    end
  end

  @doc "DELETE /admin/habitaciones/:id — Eliminar habitación (soft delete)"
  def eliminar_habitacion(conn, %{"id" => id}) do
    case HabitacionRepo.obtener(id) do
      {:ok, habitacion} ->
        changeset = HotelFlux.Domain.Habitacion.soft_delete_changeset(habitacion)
        case HotelFlux.Repo.update(changeset) do
          {:ok, _} ->
            Logger.info("[Admin] Habitación #{habitacion.numero} eliminada (soft delete)")
            conn |> json(%{ok: true, mensaje: "Habitación eliminada correctamente"})
          {:error, _} ->
            conn |> put_status(422) |> json(%{error: "No se pudo eliminar"})
        end
      {:error, _} ->
        conn |> put_status(404) |> json(%{error: "Habitación no encontrada"})
    end
  end

  # ═══════════════════════════════════════════════════════════
  # GESTIÓN DE PERSONAL
  # ═══════════════════════════════════════════════════════════

  @doc "GET /admin/personal — Listar todo el personal"
  def listar_personal(conn, params) do
    personal = UsuarioRepo.listar(params)
    conn |> json(%{data: Enum.map(personal, &serializar_usuario/1)})
  end

  @doc "POST /admin/personal — Crear nuevo empleado"
  def crear_personal(conn, params) do
    case UsuarioRepo.crear(params) do
      {:ok, usuario} ->
        Logger.info("[Admin] Empleado creado: #{usuario.nombre} (#{usuario.rol})")
        conn |> put_status(201) |> json(%{ok: true, usuario: serializar_usuario(usuario)})
      {:error, changeset} ->
        conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
    end
  end

  @doc "PUT /admin/personal/:id — Actualizar datos de empleado"
  def actualizar_personal(conn, %{"id" => id} = params) do
    case UsuarioRepo.actualizar(id, params) do
      {:ok, usuario} ->
        conn |> json(%{ok: true, usuario: serializar_usuario(usuario)})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  @doc "DELETE /admin/personal/:id — Eliminar empleado (soft delete)"
  def eliminar_personal(conn, %{"id" => id}) do
    case UsuarioRepo.eliminar(id) do
      {:ok, _} ->
        Logger.info("[Admin] Empleado #{id} eliminado (soft delete)")
        conn |> json(%{ok: true, mensaje: "Empleado eliminado correctamente"})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  @doc "GET /admin/personal/conteo — Resumen de personal por rol"
  def conteo_personal(conn, _params) do
    conteo = UsuarioRepo.contar_por_rol()
    conn |> json(%{data: conteo})
  end

  # ═══════════════════════════════════════════════════════════
  # GESTIÓN DE HORARIOS Y TURNOS
  # ═══════════════════════════════════════════════════════════

  @doc "GET /admin/turnos — Listar turnos disponibles"
  def listar_turnos(conn, _params) do
    turnos = TurnoRepo.listar()
    conn |> json(%{data: Enum.map(turnos, &serializar_turno/1)})
  end

  @doc "POST /admin/horarios — Asignar horario a empleado"
  def asignar_horario(conn, params) do
    case HorarioRepo.crear(params) do
      {:ok, horario} ->
        horario = HotelFlux.Repo.preload(horario, [:empleado, :turno])
        conn |> put_status(201) |> json(%{ok: true, horario: serializar_horario(horario)})
      {:error, changeset} ->
        conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
    end
  end

  @doc "POST /admin/horarios/semana — Generar horarios de una semana para un empleado"
  def generar_horarios_semana(conn, %{"empleado_id" => eid, "turno_id" => tid, "fecha_inicio" => fi, "dias" => dias}) do
    fecha = Date.from_iso8601!(fi)
    horarios = HorarioRepo.generar_semana(eid, tid, fecha, dias)
    conn |> put_status(201) |> json(%{
      ok: true,
      total_creados: length(horarios),
      horarios: Enum.map(horarios, fn h ->
        h = HotelFlux.Repo.preload(h, [:empleado, :turno])
        serializar_horario(h)
      end)
    })
  end

  @doc "GET /admin/horarios/semana — Horarios de la semana actual"
  def horarios_semana(conn, _params) do
    horarios = HorarioRepo.semana_actual()
    conn |> json(%{data: Enum.map(horarios, &serializar_horario/1)})
  end

  @doc "GET /admin/horarios/empleado/:id — Horarios de un empleado"
  def horarios_empleado(conn, %{"id" => id} = params) do
    fecha_inicio = parse_date_safe(Map.get(params, "desde")) |> maybe_default(Date.utc_today())
    fecha_fin = parse_date_safe(Map.get(params, "hasta")) |> maybe_default(Date.add(Date.utc_today(), 30))
    horarios = HorarioRepo.por_empleado(id, fecha_inicio, fecha_fin)
    conn |> json(%{data: Enum.map(horarios, &serializar_horario/1)})
  end

  defp parse_date_safe(nil), do: {:error, :nil}
  defp parse_date_safe(str) when is_binary(str), do: Date.from_iso8601(str)
  defp parse_date_safe(%Date{} = d), do: {:ok, d}
  defp parse_date_safe(_), do: {:error, :invalido}

  defp maybe_default({:ok, d}, _default), do: d
  defp maybe_default({:error, _}, default), do: default

  @doc "PUT /admin/horarios/:id/estado — Actualizar estado de asistencia"
  def actualizar_asistencia(conn, %{"id" => id, "estado" => estado}) do
    case HorarioRepo.actualizar_estado(id, estado) do
      {:ok, horario} ->
        horario = HotelFlux.Repo.preload(horario, [:empleado, :turno])
        conn |> json(%{ok: true, horario: serializar_horario(horario)})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  # ═══════════════════════════════════════════════════════════
  # DASHBOARD ANALÍTICO
  # ═══════════════════════════════════════════════════════════

  @doc "GET /admin/dashboard — Métricas completas con caché Redis"
  def dashboard(conn, params) do
    periodo = Map.get(params, "periodo", "dia")

    # Intentar desde caché primero
    case RedisCache.metricas_cacheadas(periodo) do
      {:ok, metricas} ->
        conn |> json(%{data: metricas, fuente: "cache"})

      {:error, _} ->
        # Calcular métricas frescas
        metricas = AnaliticaRepo.metricas_dashboard(periodo)
        metricas_serializadas = serializar_metricas(metricas)

        # Guardar en caché (30 segundos)
        RedisCache.cachear_metricas(periodo, metricas_serializadas)

        conn |> json(%{data: metricas_serializadas, fuente: "bd"})
    end
  end

  @doc "GET /admin/analitica/reservas — Reservas por período con desglose diario"
  def analitica_reservas(conn, params) do
    periodo = Map.get(params, "periodo", "mes")
    datos = AnaliticaRepo.reservas_por_periodo(periodo)
    conn |> json(%{data: datos})
  end

  @doc "GET /admin/analitica/ingresos — Ingresos por período"
  def analitica_ingresos(conn, params) do
    periodo = Map.get(params, "periodo", "mes")
    datos = AnaliticaRepo.ingresos_diarios(periodo)
    resumen = AnaliticaRepo.ingresos_por_periodo(periodo)
    conn |> json(%{data: %{diario: datos, resumen: serializar_ingresos(resumen)}})
  end

  @doc "GET /admin/analitica/productos — Productos más vendidos por período"
  def analitica_productos(conn, params) do
    periodo = Map.get(params, "periodo", "mes")
    granularidad = Map.get(params, "granularidad", "dia")
    productos = AnaliticaRepo.productos_populares(periodo)
    categorias = AnaliticaRepo.ventas_por_categoria(periodo)
    detalle = AnaliticaRepo.ventas_producto_detalladas(periodo, granularidad)
    conn |> json(%{data: %{top_productos: productos, por_categoria: categorias, detalle_temporal: detalle}})
  end

  @doc "GET /admin/analitica/habitaciones — Habitaciones más usadas por período"
  def analitica_habitaciones(conn, params) do
    periodo = Map.get(params, "periodo", "mes")
    mas_usadas = AnaliticaRepo.habitaciones_mas_usadas(periodo)
    ocupacion_tipo = AnaliticaRepo.ocupacion_por_tipo()
    ingresos_hab = AnaliticaRepo.ingresos_por_habitacion(periodo)
    conn |> json(%{data: %{mas_usadas: mas_usadas, ocupacion_por_tipo: ocupacion_tipo, ingresos_por_habitacion: ingresos_hab}})
  end

  @doc "GET /admin/analitica/ocupacion — Ocupación histórica por período"
  def analitica_ocupacion(conn, params) do
    _periodo = Map.get(params, "periodo", "mes")
    ocupacion = AnaliticaRepo.ocupacion_actual()
    tipo = AnaliticaRepo.ocupacion_por_tipo()
    conn |> json(%{data: %{porcentaje_actual: ocupacion, por_tipo: tipo}})
  end

  # ═══════════════════════════════════════════════════════════
  # EXPORTACIÓN EXCEL (CSV)
  # ═══════════════════════════════════════════════════════════

  @doc "GET /admin/exportar/reservas — Descargar reservas en CSV"
  def exportar_reservas(conn, params) do
    periodo = Map.get(params, "periodo", "mes")
    datos = AnaliticaRepo.reservas_por_periodo(periodo)

    csv = generar_csv_reservas(datos)

    conn
    |> put_resp_content_type("text/csv")
    |> put_resp_header("content-disposition", "attachment; filename=\"reservas_#{periodo}.csv\"")
    |> send_resp(200, csv)
  end

  @doc "GET /admin/exportar/ingresos — Descargar ingresos en CSV"
  def exportar_ingresos(conn, params) do
    periodo = Map.get(params, "periodo", "mes")
    datos = AnaliticaRepo.ingresos_diarios(periodo)

    csv = generar_csv_ingresos(datos)

    conn
    |> put_resp_content_type("text/csv")
    |> put_resp_header("content-disposition", "attachment; filename=\"ingresos_#{periodo}.csv\"")
    |> send_resp(200, csv)
  end

  @doc "GET /admin/exportar/personal — Descargar listado de personal en CSV"
  def exportar_personal(conn, _params) do
    personal = UsuarioRepo.listar()

    csv = generar_csv_personal(personal)

    conn
    |> put_resp_content_type("text/csv")
    |> put_resp_header("content-disposition", "attachment; filename=\"personal_hotelflux.csv\"")
    |> send_resp(200, csv)
  end

  # ═══════════════════════════════════════════════════════════
  # GENERADORES CSV
  # ═══════════════════════════════════════════════════════════

  # Previene CSV injection: si un valor comienza con =, +, -, @ o %,
  # lo prefija con tabulación para que Excel/Sheets no lo interprete como fórmula.
  defp escapar_csv(val) when is_binary(val) do
    if String.match?(val, ~r/^[=+\-@%\|]/) do
      "\t" <> val
    else
      val
    end
  end
  defp escapar_csv(val), do: to_string(val)

  defp generar_csv_reservas(datos) do
    encabezado = "Fecha,Total,Confirmadas,Canceladas,Check-In,Check-Out\n"
    filas = Enum.map(datos, fn d ->
      Enum.map_join([d.fecha, d.total, d.confirmadas, d.canceladas, d.checked_in, d.checked_out], ",", &escapar_csv/1)
    end) |> Enum.join("\n")
    encabezado <> filas
  end

  defp generar_csv_ingresos(datos) do
    encabezado = "Fecha,Monto,Cantidad Pagos\n"
    filas = Enum.map(datos, fn d ->
      Enum.map_join([d.fecha, d.monto, d.cantidad], ",", &escapar_csv/1)
    end) |> Enum.join("\n")
    encabezado <> filas
  end

  defp generar_csv_personal(personal) do
    encabezado = "Nombre,Email,Rol,Activo\n"
    filas = Enum.map(personal, fn u ->
      Enum.map_join([u.nombre, u.email, u.rol, u.activo], ",", &escapar_csv/1)
    end) |> Enum.join("\n")
    encabezado <> filas
  end

  # ═══════════════════════════════════════════════════════════
  # SERIALIZADORES
  # ═══════════════════════════════════════════════════════════

  defp serializar_piso(p) do
    %{id: p.id, numero: p.numero, nombre: p.nombre, descripcion: p.descripcion, activo: p.activo}
  end

  defp serializar_habitacion(h) do
    %{id: h.id, numero: h.numero, tipo: h.tipo, piso: h.piso, capacidad: h.capacidad,
      precio_noche: to_string(h.precio_noche), estado: h.estado, clasificacion: h.clasificacion,
      caracteristicas: h.caracteristicas}
  end

  defp serializar_usuario(u) do
    turno = case Ecto.assoc_loaded?(u.turno) do
      true -> u.turno && %{id: u.turno.id, nombre: u.turno.nombre, hora_inicio: Time.to_string(u.turno.hora_inicio), hora_fin: Time.to_string(u.turno.hora_fin)}
      false -> nil
    end

    %{id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo, turno_id: u.turno_id, turno: turno}
  end

  defp serializar_turno(t) do
    %{id: t.id, nombre: t.nombre, hora_inicio: Time.to_string(t.hora_inicio),
      hora_fin: Time.to_string(t.hora_fin), activo: t.activo}
  end

  defp serializar_horario(h) do
    %{
      id: h.id,
      fecha: h.fecha,
      dia_semana: h.dia_semana,
      estado: h.estado,
      notas: h.notas,
      empleado: if(Ecto.assoc_loaded?(h.empleado), do: serializar_usuario(h.empleado), else: nil),
      turno: if(Ecto.assoc_loaded?(h.turno), do: serializar_turno(h.turno), else: nil)
    }
  end

  defp serializar_metricas(m) do
    %{
      ocupacion: m.ocupacion,
      ingresos: serializar_ingresos(m.ingresos),
      reservas: m.reservas,
      limpieza: m.limpieza,
      productos_populares: m.productos_populares
    }
  end

  defp serializar_ingresos(i) do
    %{
      ingresos_reservas: to_string(i.ingresos_reservas),
      ingresos_consumos: to_string(i.ingresos_consumos),
      total: to_string(i.total)
    }
  end

  defp broadcast_habitacion(hab) do
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "habitaciones", {
      :habitacion_actualizada,
      %{id: hab.id, numero: hab.numero, estado: hab.estado, piso: hab.piso}
    })
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
