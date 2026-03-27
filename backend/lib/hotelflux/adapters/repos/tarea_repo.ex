defmodule HotelFlux.Adapters.Repos.TareaRepo do
  @moduledoc "Adaptador — Repositorio de tareas de limpieza."

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.{TareaLimpieza, Usuario}

  def obtener(id) do
    case Repo.get(TareaLimpieza, id) |> Repo.preload(:habitacion) do
      nil -> {:error, :not_found}
      tarea -> {:ok, tarea}
    end
  end

  def crear(attrs) do
    %TareaLimpieza{}
    |> TareaLimpieza.changeset(attrs)
    |> Repo.insert()
  end

  def listar do
    TareaLimpieza
    |> where([t], t.eliminado == false)
    |> order_by([t], desc: t.inserted_at)
    |> preload(:habitacion)
    |> Repo.all()
  end

  def por_empleado(empleado_id) do
    from(t in TareaLimpieza,
      where: t.empleado_id == ^empleado_id,
      where: t.estado in ["pendiente", "en_proceso"],
      order_by: [desc: t.inserted_at],
      preload: :habitacion
    )
    |> Repo.all()
  end

  @doc """
  Encuentra al empleado de limpieza con menos tareas pendientes.
  Query funcional composable.
  """
  def empleado_con_menos_carga do
    resultado =
      from(u in Usuario,
        where: u.rol == "limpieza" and u.activo == true,
        left_join: t in TareaLimpieza,
          on: t.empleado_id == u.id and t.estado in ["pendiente", "en_proceso"],
        group_by: u.id,
        order_by: [asc: count(t.id)],
        select: u.id,
        limit: 1
      )
      |> Repo.one()

    case resultado do
      nil -> {:error, :sin_empleados}
      id -> {:ok, id}
    end
  end

  @doc "Calcula el tiempo promedio de limpieza de las últimas 24h."
  def promedio_limpieza_24h do
    hace_24h = DateTime.add(DateTime.utc_now(), -86400, :second)

    from(t in TareaLimpieza,
      where: t.estado == "completada",
      where: t.completada_en >= ^hace_24h,
      where: not is_nil(t.duracion_minutos),
      select: avg(t.duracion_minutos)
    )
    |> Repo.one() || 0
  end
end
