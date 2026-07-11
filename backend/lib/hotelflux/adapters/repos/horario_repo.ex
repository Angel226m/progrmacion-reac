defmodule HotelFlux.Adapters.Repos.HorarioRepo do
  @moduledoc """
  Adaptador — Repositorio de horarios del personal.
  Permite gestionar turnos asignados a empleados con consultas analíticas.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.HorarioPersonal, as: HorarioPersonalEsquema
  alias HotelFlux.Infra.Persistence.Schema.Usuario, as: UsuarioEsquema
  alias HotelFlux.Domain.HorarioPersonal

  @doc "Obtener horario por ID"
  def obtener(id) do
    case Repo.get(HorarioPersonalEsquema, id) |> Repo.preload([:empleado, :turno]) do
      nil -> {:error, :not_found}
      horario -> {:ok, to_domain(horario)}
    end
  end

  @doc "Crear un nuevo horario para un empleado"
  def crear(attrs) do
    %HorarioPersonalEsquema{}
    |> HorarioPersonalEsquema.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, horario} -> {:ok, to_domain(horario)}
      {:error, _} = err -> err
    end
  end

  @doc "Actualizar estado de un horario (asistió, falta, permiso)"
  def actualizar_estado(id, estado) do
    with {:ok, horario} <- obtener(id) do
      horario
      |> from_domain()
      |> HorarioPersonalEsquema.changeset(%{estado: estado})
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, to_domain(updated)}
        {:error, _} = err -> err
      end
    end
  end

  @doc "Listar horarios de un empleado en un rango de fechas"
  def por_empleado(empleado_id, fecha_inicio, fecha_fin) do
    from(h in HorarioPersonalEsquema,
      where: h.empleado_id == ^empleado_id,
      where: h.fecha >= ^fecha_inicio and h.fecha <= ^fecha_fin,
      where: h.eliminado == false,
      preload: [:turno],
      order_by: [asc: h.fecha]
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc "Listar horarios de todos los empleados para una fecha"
  def por_fecha(fecha) do
    from(h in HorarioPersonalEsquema,
      where: h.fecha == ^fecha,
      where: h.eliminado == false,
      preload: [:empleado, :turno],
      order_by: [asc: h.turno_id]
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc "Listar horarios de la semana actual para todos los empleados"
  def semana_actual do
    hoy = Date.utc_today()
    dia_semana = Date.day_of_week(hoy)
    lunes = Date.add(hoy, -(dia_semana - 1))
    domingo = Date.add(lunes, 6)

    from(h in HorarioPersonalEsquema,
      where: h.fecha >= ^lunes and h.fecha <= ^domingo,
      where: h.eliminado == false,
      preload: [:empleado, :turno],
      order_by: [asc: h.fecha, asc: h.turno_id]
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc "Generar horarios automáticos para una semana"
  def generar_semana(empleado_id, turno_id, fecha_inicio, dias) do
    Enum.reduce(0..(dias - 1), [], fn offset, acc ->
      fecha = Date.add(fecha_inicio, offset)
      attrs = %{
        empleado_id: empleado_id,
        turno_id: turno_id,
        fecha: fecha,
        estado: "programado"
      }

      case crear(attrs) do
        {:ok, horario} -> [horario | acc]
        {:error, _} -> acc
      end
    end)
    |> Enum.reverse()
  end

  @doc "Resumen de asistencia por empleado en un mes"
  def resumen_asistencia(empleado_id, anio, mes) do
    fecha_inicio = Date.new!(anio, mes, 1)
    ultimo_dia = Date.days_in_month(fecha_inicio)
    fecha_fin = Date.new!(anio, mes, ultimo_dia)

    from(h in HorarioPersonalEsquema,
      where: h.empleado_id == ^empleado_id,
      where: h.fecha >= ^fecha_inicio and h.fecha <= ^fecha_fin,
      where: h.eliminado == false,
      group_by: h.estado,
      select: {h.estado, count(h.id)}
    )
    |> Repo.all()
    |> Map.new()
  end

  @doc "Empleados disponibles para un turno en una fecha"
  def empleados_disponibles(_turno_id, fecha) do
    empleados_asignados =
      from(h in HorarioPersonalEsquema,
        where: h.fecha == ^fecha and h.eliminado == false,
        select: h.empleado_id
      )

    from(u in UsuarioEsquema,
      where: u.activo == true and u.eliminado == false,
      where: u.id not in subquery(empleados_asignados),
      order_by: [asc: u.nombre]
    )
    |> Repo.all()
  end

  defp to_domain(%HorarioPersonalEsquema{} = s) do
    struct(HorarioPersonal, Map.from_struct(s))
  end

  defp from_domain(%HorarioPersonal{} = d) do
    struct(HorarioPersonalEsquema, Map.from_struct(d))
  end
end
