defmodule HotelFlux.Adapters.Repos.TareaRepo do
  @moduledoc """
  Adaptador — Repositorio de tareas de limpieza.

  ## Observable Repository Pattern
  Emite eventos vía PubSub al topic "limpieza" tras cada mutación.
  El frontend suscrito via WebSocket recibe actualizaciones sin polling.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.TareaLimpieza, as: TareaLimpiezaEsquema
  alias HotelFlux.Infra.Persistence.Schema.Usuario, as: UsuarioEsquema
  alias HotelFlux.Domain.TareaLimpieza

  @topic_cambios "limpieza"

  def topic_cambios, do: @topic_cambios

  def suscribir_cambios(_opts \\ %{}) do
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, @topic_cambios)
  end

  @known_events %{
    "tarea_asignada" => :tarea_asignada,
    "tarea_actualizada" => :tarea_actualizada
  }

  def broadcast_cambio(tipo_evento, payload) do
    with {:ok, atom} <- Map.fetch(@known_events, tipo_evento) do
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, @topic_cambios, {atom, payload})
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, "hotel:lobby", {
        :"limpieza:update",
        Map.put(payload, :evento, tipo_evento)
      })
    end
  end

  def obtener(id) do
    case Repo.get(TareaLimpiezaEsquema, id) |> Repo.preload(:habitacion) do
      nil -> {:error, :not_found}
      tarea -> {:ok, to_domain(tarea)}
    end
  end

  def crear(attrs) do
    with {:ok, tarea} <- %TareaLimpiezaEsquema{} |> TareaLimpiezaEsquema.changeset(attrs) |> Repo.insert() do
      tarea_loaded = Repo.preload(tarea, :habitacion)
      broadcast_cambio("tarea_asignada", serialize(tarea_loaded))
      {:ok, to_domain(tarea_loaded)}
    end
  end

  def listar do
    TareaLimpiezaEsquema
    |> where([t], t.eliminado == false)
    |> order_by([t], desc: t.inserted_at)
    |> preload(:habitacion)
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  def por_empleado(empleado_id) do
    from(t in TareaLimpiezaEsquema,
      where: t.empleado_id == ^empleado_id,
      where: t.estado in ["pendiente", "en_proceso"],
      order_by: [desc: t.inserted_at],
      preload: :habitacion
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc """
  Encuentra al empleado de limpieza con menos tareas pendientes.
  Query funcional composable.
  """
  def empleado_con_menos_carga do
    resultado =
      from(u in UsuarioEsquema,
        where: u.rol == "limpieza" and u.activo == true,
        left_join: t in TareaLimpiezaEsquema,
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
      from(t in TareaLimpiezaEsquema,
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
    with {:ok, tarea} <- obtener(id) do
      tarea_esquema = from_domain(tarea)
      tarea_esquema
      |> TareaLimpiezaEsquema.changeset(%{estado: nuevo_estado})
      |> Repo.update()
      |> case do
        {:ok, updated} ->
          updated_loaded = Repo.preload(updated, :habitacion)
          broadcast_cambio("tarea_actualizada", serialize(updated_loaded))
          {:ok, to_domain(updated_loaded)}
        {:error, changeset} -> {:error, changeset}
      end
    end
  end

  defp serializar_habitacion(t) do
    case Ecto.assoc_loaded?(t.habitacion) do
      true -> %{id: t.habitacion.id, numero: t.habitacion.numero, piso: t.habitacion.piso, tipo: t.habitacion.tipo}
      false -> nil
    end
  end

  defp serialize(%{} = t) do
    %{
      id: t.id,
      habitacion_id: t.habitacion_id,
      empleado_id: t.empleado_id,
      estado: t.estado,
      prioridad: t.prioridad,
      notas: t.notas,
      inserted_at: t.inserted_at,
      iniciada_at: t.iniciada_en,
      completada_at: t.completada_en,
      habitacion: serializar_habitacion(t)
    }
  end

  defp to_domain(%TareaLimpiezaEsquema{} = s) do
    struct(TareaLimpieza, Map.from_struct(s))
  end

  defp from_domain(%TareaLimpieza{} = d) do
    struct(TareaLimpiezaEsquema, Map.from_struct(d))
  end
end
