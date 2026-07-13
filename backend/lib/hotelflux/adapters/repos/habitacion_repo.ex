defmodule HotelFlux.Adapters.Repos.HabitacionRepo do
  @moduledoc """
  Adaptador — Repositorio de habitaciones (implementa HabitacionPort).
  Queries funcionales composables con Ecto.

  ## Observable Repository Pattern
  Implementa `ObservableRepository`: tras cada mutación exitosa, emite
  un evento vía Phoenix.PubSub al topic "habitaciones".
  El Channel lo recibe y reenvía al frontend por WebSocket.
  El frontend (RxJS) acumula los eventos con `scan` — sin recargar.

  Flujo:
    cambiar_estado/2 → Repo.update → broadcast_cambio/2
      → PubSub "habitaciones" → HabitacionChannel.handle_info
      → push socket → RxJS scan → estado actualizado en UI

  Demuestra: Queries como funciones composables, sin mutación directa.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Habitacion, as: HabitacionEsquema
  alias HotelFlux.Infra.Persistence.Schema.Reserva, as: ReservaEsquema
  alias HotelFlux.Domain.Habitacion

  # ── Observable Repository: topic de PubSub para este agregado ──
  @topic_cambios "habitaciones"

  @doc "Topic PubSub de este repositorio (Observable Repository pattern)."
  def topic_cambios, do: @topic_cambios

  @doc """
  Suscribe al proceso actual a los cambios de habitaciones.
  El proceso receptor recibirá mensajes `{:habitacion_actualizada, payload}`.
  """
  def suscribir_cambios(_opts \\ %{}) do
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, @topic_cambios)
  end

  @doc """
  Difunde un cambio vía PubSub — el corazón del Observable Repository.
  Tipo de evento → payload tipado → todos los suscriptores son notificados.
  """
  @known_events %{
    "habitacion_creada" => :habitacion_creada,
    "habitacion_actualizada" => :habitacion_actualizada
  }

  def broadcast_cambio(tipo_evento, payload) do
    with {:ok, atom} <- Map.fetch(@known_events, tipo_evento) do
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, @topic_cambios, {atom, payload})
    end
  end

  def obtener(id) do
    case Repo.get(HabitacionEsquema, id) do
      nil -> {:error, :not_found}
      %{eliminado: true} -> {:error, :eliminado}
      habitacion -> {:ok, to_domain(habitacion)}
    end
  end

  def listar(filtros \\ %{}) do
    HabitacionEsquema
    |> where([h], h.eliminado == false)
    |> aplicar_filtros(filtros)
    |> order_by([h], [h.piso, h.numero])
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  def crear(attrs) do
    with {:ok, habitacion} <- %HabitacionEsquema{} |> HabitacionEsquema.changeset(attrs) |> Repo.insert() do
      habitacion_domain = to_domain(habitacion)
      broadcast_cambio("habitacion_creada", serialize(habitacion_domain))
      {:ok, habitacion_domain}
    end
  end

  @doc """
  Cambia el estado de la habitación.
  Primero valida la transición con la función PURA del dominio.
  Tras actualizar en BD, emite broadcast (Observable Repository).
  """
  def cambiar_estado(id, nuevo_estado) do
    with {:ok, habitacion} <- obtener(id),
         {:ok, changeset} <- Habitacion.cambiar_estado(habitacion, nuevo_estado) do
      habitacion_actualizada = Ecto.Changeset.apply_changes(changeset)
      hab_esquema = from_domain(habitacion_actualizada)
      changeset = Ecto.Changeset.change(hab_esquema)
      with {:ok, updated} <- Repo.update(changeset) do
        updated_domain = to_domain(updated)
        broadcast_cambio("habitacion_actualizada", serialize(updated_domain))
        {:ok, updated_domain}
      end
    end
  end

  @doc """
  Busca habitaciones disponibles (de cualquier tipo)
  que NO tengan reservas superpuestas en las fechas dadas.
  """
  def buscar_disponible(fecha_entrada, fecha_salida) do
    reservadas_ids =
      from(r in ReservaEsquema,
        where: r.estado in ["confirmada", "checked_in"],
        where: r.eliminado == false,
        where: r.fecha_entrada < ^fecha_salida,
        where: r.fecha_salida > ^fecha_entrada,
        select: r.habitacion_id
      )

    from(h in HabitacionEsquema,
      where: h.estado not in ["en_mantenimiento", "fuera_de_servicio"],
      where: h.eliminado == false,
      where: h.id not in subquery(reservadas_ids),
      order_by: [h.piso, h.numero]
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc """
  Busca una habitación disponible del tipo solicitado
  que NO tenga reservas superpuestas en las fechas dadas.

  Query composable funcional con Ecto.
  """
  def buscar_disponible(tipo, fecha_entrada, fecha_salida) do
    reservadas_ids =
      from(r in ReservaEsquema,
        where: r.estado in ["confirmada", "checked_in"],
        where: r.eliminado == false,
        where: r.fecha_entrada < ^fecha_salida,
        where: r.fecha_salida > ^fecha_entrada,
        select: r.habitacion_id
      )

    resultado =
      from(h in HabitacionEsquema,
        where: h.tipo == ^tipo,
        where: h.estado not in ["en_mantenimiento", "fuera_de_servicio"],
        where: h.eliminado == false,
        where: h.id not in subquery(reservadas_ids),
        limit: 1
      )
      |> Repo.one()

    case resultado do
      nil -> {:error, :sin_disponibilidad}
      habitacion -> {:ok, to_domain(habitacion)}
    end
  end

  @doc """
  Verifica si una habitación específica no tiene reservas activas en el rango de fechas dado.
  Función pura de consulta — sin efectos secundarios.
  """
  def esta_disponible?(habitacion_id, fecha_entrada, fecha_salida) do
    count =
      from(r in ReservaEsquema,
        where: r.habitacion_id == ^habitacion_id,
        where: r.estado in ["confirmada", "checked_in"],
        where: r.eliminado == false,
        where: r.fecha_entrada < ^fecha_salida,
        where: r.fecha_salida > ^fecha_entrada,
        select: count(r.id)
      )
      |> Repo.one()

    count == 0
  end

  @doc """
  Cuenta habitaciones por estado — usado en el dashboard reactivo.
  Retorna un mapa inmutable: %{"disponible" => 10, "ocupada" => 5, ...}
  """
  def contar_por_estado do
    from(h in HabitacionEsquema,
      where: h.eliminado == false,
      group_by: h.estado,
      select: {h.estado, count(h.id)}
    )
    |> Repo.all()
    |> Map.new()
  end

  def actualizar(id, attrs) do
    with {:ok, habitacion} <- obtener(id) do
      habitacion
      |> from_domain()
      |> HabitacionEsquema.changeset(attrs)
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, to_domain(updated)}
        {:error, _} = err -> err
      end
    end
  end

  def eliminar(id) do
    with {:ok, habitacion} <- obtener(id) do
      habitacion
      |> from_domain()
      |> HabitacionEsquema.soft_delete_changeset()
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, to_domain(updated)}
        {:error, _} = err -> err
      end
    end
  end

  def generar(piso, cantidad, tipo) do
    multi =
      Enum.reduce(1..cantidad, Ecto.Multi.new(), fn i, acc_multi ->
        numero = piso * 100 + i
        attrs = %{
          numero: numero,
          piso: piso,
          tipo: tipo,
          estado: "disponible",
          precio_noche: obtener_precio_base(tipo),
          capacidad: obtener_capacidad_base(tipo)
        }
        Ecto.Multi.run(acc_multi, :"habitacion_#{i}", fn repo, _ ->
          %HabitacionEsquema{}
          |> HabitacionEsquema.changeset(attrs)
          |> repo.insert()
          |> case do
            {:ok, h} -> {:ok, to_domain(h)}
            {:error, cs} -> {:error, cs}
          end
        end)
      end)

    case Repo.transaction(multi) do
      {:ok, resultados} ->
        ids = Enum.sort(Map.keys(resultados))
        {:ok, Enum.map(ids, fn k -> resultados[k] end)}

      {:error, _paso_fallido, error, _rollback} ->
        {:error, error}
    end
  end

  defp obtener_precio_base("simple"), do: Decimal.new("80")
  defp obtener_precio_base("doble"), do: Decimal.new("120")
  defp obtener_precio_base("suite"), do: Decimal.new("200")
  defp obtener_precio_base(_), do: Decimal.new("100")

  defp obtener_capacidad_base("simple"), do: 1
  defp obtener_capacidad_base("doble"), do: 2
  defp obtener_capacidad_base("suite"), do: 4
  defp obtener_capacidad_base(_), do: 2

  @doc "Obtiene todas las habitaciones de un piso (excluye eliminadas)."
  def por_piso(piso) do
    from(h in HabitacionEsquema, where: h.piso == ^piso and h.eliminado == false, order_by: h.numero)
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  # Composición funcional de filtros
  defp aplicar_filtros(query, filtros) do
    Enum.reduce(filtros, query, fn
      {"piso", piso}, q -> where(q, [h], h.piso == ^piso)
      {"estado", estado}, q -> where(q, [h], h.estado == ^estado)
      {"tipo", tipo}, q -> where(q, [h], h.tipo == ^tipo)
      _, q -> q
    end)
  end

  # ── Función pura: serialización para broadcast ──
  defp serialize(%{} = h) do
    %{
      id: h.id,
      numero: h.numero,
      piso: h.piso,
      tipo: h.tipo,
      estado: h.estado,
      capacidad: h.capacidad,
      precio_noche: h.precio_noche,
      eliminado: h.eliminado
    }
  end

  defp to_domain(%HabitacionEsquema{} = s) do
    struct(Habitacion, Map.from_struct(s))
  end

  defp from_domain(%Habitacion{} = d) do
    struct(HabitacionEsquema, Map.from_struct(d))
  end
end
