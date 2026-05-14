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
  alias HotelFlux.Domain.{Habitacion, Reserva}

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
  def broadcast_cambio(tipo_evento, payload) do
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, @topic_cambios, {
      String.to_atom(tipo_evento),
      payload
    })
  end

  def obtener(id) do
    case Repo.get(Habitacion, id) do
      nil -> {:error, :not_found}
      %{eliminado: true} -> {:error, :eliminado}
      habitacion -> {:ok, habitacion}
    end
  end

  def listar(filtros \\ %{}) do
    Habitacion
    |> where([h], h.eliminado == false)
    |> aplicar_filtros(filtros)
    |> order_by([h], [h.piso, h.numero])
    |> Repo.all()
  end

  def crear(attrs) do
    with {:ok, habitacion} <- %Habitacion{} |> Habitacion.changeset(attrs) |> Repo.insert() do
      # Observable Repository: notificar a todos los suscriptores
      broadcast_cambio("habitacion_creada", serialize(habitacion))
      {:ok, habitacion}
    end
  end

  @doc """
  Cambia el estado de la habitación.
  Primero valida la transición con la función PURA del dominio.
  Tras actualizar en BD, emite broadcast (Observable Repository).
  """
  def cambiar_estado(id, nuevo_estado) do
    with {:ok, habitacion} <- obtener(id),
         {:ok, changeset} <- Habitacion.cambiar_estado(habitacion, nuevo_estado),
         {:ok, updated} <- Repo.update(changeset) do
      # Observable Repository: broadcast del cambio al topic PubSub
      # Todos los procesos suscritos (Channel, Workers) lo reciben
      broadcast_cambio("habitacion_actualizada", serialize(updated))
      {:ok, updated}
    end
  end

  @doc """
  Busca habitaciones disponibles (de cualquier tipo)
  que NO tengan reservas superpuestas en las fechas dadas.
  """
  def buscar_disponible(fecha_entrada, fecha_salida) do
    reservadas_ids =
      from(r in Reserva,
        where: r.estado in ["confirmada", "checked_in"],
        where: r.eliminado == false,
        where: r.fecha_entrada < ^fecha_salida,
        where: r.fecha_salida > ^fecha_entrada,
        select: r.habitacion_id
      )

    from(h in Habitacion,
      where: h.estado == "disponible",
      where: h.eliminado == false,
      where: h.id not in subquery(reservadas_ids),
      order_by: [h.piso, h.numero]
    )
    |> Repo.all()
  end

  @doc """
  Busca una habitación disponible del tipo solicitado
  que NO tenga reservas superpuestas en las fechas dadas.

  Query composable funcional con Ecto.
  """
  def buscar_disponible(tipo, fecha_entrada, fecha_salida) do
    # Subconsulta: IDs de habitaciones ya reservadas en esas fechas
    reservadas_ids =
      from(r in Reserva,
        where: r.estado in ["confirmada", "checked_in"],
        where: r.eliminado == false,
        where: r.fecha_entrada < ^fecha_salida,
        where: r.fecha_salida > ^fecha_entrada,
        select: r.habitacion_id
      )

    # Buscar habitación disponible que no esté en las reservadas
    resultado =
      from(h in Habitacion,
        where: h.tipo == ^tipo,
        where: h.estado == "disponible",
        where: h.eliminado == false,
        where: h.id not in subquery(reservadas_ids),
        limit: 1
      )
      |> Repo.one()

    case resultado do
      nil -> {:error, :sin_disponibilidad}
      habitacion -> {:ok, habitacion}
    end
  end

  @doc """
  Cuenta habitaciones por estado — usado en el dashboard reactivo.
  Retorna un mapa inmutable: %{"disponible" => 10, "ocupada" => 5, ...}
  """
  def contar_por_estado do
    from(h in Habitacion,
      where: h.eliminado == false,
      group_by: h.estado,
      select: {h.estado, count(h.id)}
    )
    |> Repo.all()
    |> Map.new()
  end

  @doc "Obtiene todas las habitaciones de un piso (excluye eliminadas)."
  def por_piso(piso) do
    from(h in Habitacion, where: h.piso == ^piso and h.eliminado == false, order_by: h.numero)
    |> Repo.all()
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
  # Extrae solo los campos necesarios para el payload del evento.
  # Evita enviar datos sensibles o estructuras Ecto internas.
  defp serialize(%Habitacion{} = h) do
    %{
      id: h.id,
      numero: h.numero,
      piso: h.piso,
      tipo: h.tipo,
      estado: h.estado,
      capacidad: h.capacidad,
      precio_base: h.precio_base,
      eliminado: h.eliminado
    }
  end
end
