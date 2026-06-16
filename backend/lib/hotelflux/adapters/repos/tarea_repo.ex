defmodule HotelFlux.Adapters.Repos.TareaRepo do
  @moduledoc """
  Adaptador — Repositorio de tareas de limpieza.

  ## Observable Repository Pattern
  Emite eventos vía PubSub al topic "limpieza" tras cada mutación.
  El frontend suscrito via WebSocket recibe actualizaciones sin polling.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.{TareaLimpieza, Usuario}

  @topic_cambios "limpieza"

  def topic_cambios, do: @topic_cambios

  def suscribir_cambios(_opts \\ %{}) do
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, @topic_cambios)
  end

  def broadcast_cambio(tipo_evento, payload) do
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, @topic_cambios, {
      String.to_atom(tipo_evento),
      payload
    })
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "hotel:lobby", {
      :"limpieza:update",
      Map.put(payload, :evento, tipo_evento)
    })
  end

  def obtener(id) do
    case Repo.get(TareaLimpieza, id) |> Repo.preload(:habitacion) do
      nil -> {:error, :not_found}
      tarea -> {:ok, tarea}
    end
  end

  def crear(attrs) do
    with {:ok, tarea} <- %TareaLimpieza{} |> TareaLimpieza.changeset(attrs) |> Repo.insert() do
      tarea_loaded = Repo.preload(tarea, :habitacion)
      broadcast_cambio("tarea_asignada", serialize(tarea_loaded))
      {:ok, tarea_loaded}
    end
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

  @doc "Calcula el tiempo promedio de limpieza de las últimas 24h. Siempre retorna Float."
  def promedio_limpieza_24h do
    hace_24h = DateTime.add(DateTime.utc_now(), -86400, :second)

    result =
      from(t in TareaLimpieza,
        where: t.estado == "completada",
        where: t.completada_en >= ^hace_24h,
        where: not is_nil(t.duracion_minutos),
        select: avg(t.duracion_minutos)
      )
      |> Repo.one()

    case result do
      nil -> 0.0
      %Decimal{} = d -> d |> Decimal.to_float() |> Float.round(1)
      n -> n * 1.0
    end
  end

  def actualizar_estado(id, nuevo_estado) do
    case Repo.get(TareaLimpieza, id) do
      nil -> {:error, :not_found}
      tarea ->
        tarea
        |> TareaLimpieza.changeset(%{estado: nuevo_estado})
        |> Repo.update()
        |> case do
          {:ok, tarea} ->
            tarea_loaded = Repo.preload(tarea, :habitacion)
            broadcast_cambio("tarea_actualizada", serialize(tarea_loaded))
            {:ok, tarea_loaded}
          {:error, changeset} -> {:error, changeset}
        end
    end
  end

  defp serialize(%TareaLimpieza{} = t) do
    %{
      id: t.id,
      habitacion_id: t.habitacion_id,
      empleado_id: t.empleado_id,
      estado: t.estado,
      prioridad: t.prioridad,
      notas: t.notas,
      inserted_at: t.inserted_at
    }
  end
end
