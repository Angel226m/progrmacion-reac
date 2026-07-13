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

  # Topic de PubSub para cambios en tareas de limpieza
  @topic_cambios "limpieza"

  # Retorna el topic de PubSub para este repositorio
  def topic_cambios, do: @topic_cambios

  # Suscribe el proceso actual a cambios en tareas de limpieza
  def suscribir_cambios(_opts \\ %{}) do
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, @topic_cambios)
  end

  @known_events %{
    "tarea_asignada" => :tarea_asignada,
    "tarea_actualizada" => :tarea_actualizada
  }

  # Difunde cambios de tareas al topic de limpieza y al lobby general
  def broadcast_cambio(tipo_evento, payload) do
    with {:ok, atom} <- Map.fetch(@known_events, tipo_evento) do
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, @topic_cambios, {atom, payload})
      # También difunde al lobby del hotel para actualizaciones en tiempo real
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, "hotel:lobby", {
        :"limpieza:update",
        Map.put(payload, :evento, tipo_evento)
      })
    end
  end

  # Obtiene una tarea por ID con su habitación precargada
  def obtener(id) do
    case Repo.get(TareaLimpiezaEsquema, id) |> Repo.preload(:habitacion) do
      nil -> {:error, :not_found}
      tarea -> {:ok, to_domain(tarea)}
    end
  end

  # Crea una nueva tarea de limpieza y emite broadcast del evento
  def crear(attrs) do
    with {:ok, tarea} <- %TareaLimpiezaEsquema{} |> TareaLimpiezaEsquema.changeset(attrs) |> Repo.insert() do
      tarea_loaded = Repo.preload(tarea, :habitacion)
      broadcast_cambio("tarea_asignada", serialize(tarea_loaded))
      {:ok, to_domain(tarea_loaded)}
    end
  end

  # Lista todas las tareas activas ordenadas por fecha descendente
  def listar do
    TareaLimpiezaEsquema
    |> where([t], t.eliminado == false)
    |> order_by([t], desc: t.inserted_at)
    |> preload(:habitacion)
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  # Obtiene tareas pendientes o en proceso asignadas a un empleado específico
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
  # Encuentra al empleado de limpieza con la carga de trabajo más baja
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
  # Calcula el promedio de duración de tareas completadas en las últimas 24 horas
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

  # Actualiza el estado de una tarea y emite broadcast del cambio
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

  # Serializa la habitación asociada si está precargada
  defp serializar_habitacion(t) do
    case Ecto.assoc_loaded?(t.habitacion) do
      true -> %{id: t.habitacion.id, numero: t.habitacion.numero, piso: t.habitacion.piso, tipo: t.habitacion.tipo}
      false -> nil
    end
  end

  # Serializa el struct de dominio a mapa plano para broadcast
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

  # Convierte esquema de persistencia a struct de dominio
  # Incluye la habitación precargada si la asociación está cargada
  defp to_domain(%TareaLimpiezaEsquema{} = s) do
    base = struct(TareaLimpieza, Map.from_struct(s))
    if Ecto.assoc_loaded?(s.habitacion) do
      %{base | habitacion: s.habitacion}
    else
      base
    end
  end

  # Convierte struct de dominio a esquema de persistencia
  defp from_domain(%TareaLimpieza{} = d) do
    struct(TareaLimpiezaEsquema, Map.from_struct(d))
  end
end
