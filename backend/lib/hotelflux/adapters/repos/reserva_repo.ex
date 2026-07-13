defmodule HotelFlux.Adapters.Repos.ReservaRepo do
  @moduledoc """
  Repositorio de reservas con transiciones validadas.

  Principios FRP:
  - Sin if/else: pattern matching + map dispatch
  - Validación de transiciones vía mapa @transiciones
  - Broadcast reactivo post-mutación
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Reserva, as: ReservaEsquema
  alias HotelFlux.Domain.Reserva

  # Topic de PubSub para cambios en reservas
  @topic_cambios "reservas"

  # Retorna el topic de PubSub para este repositorio
  def topic_cambios, do: @topic_cambios

  # Suscribe el proceso actual a cambios en reservas
  def suscribir_cambios(_opts \\ %{}) do
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, @topic_cambios)
  end

  @known_events %{
    "reserva_creada" => :reserva_creada,
    "reserva_actualizada" => :reserva_actualizada
  }

  # Difunde cambios de reserva al topic específico y al lobby general
  def broadcast_cambio(tipo_evento, payload) do
    with {:ok, atom} <- Map.fetch(@known_events, tipo_evento) do
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, @topic_cambios, {atom, payload})
      # También difunde al lobby del hotel para actualizaciones en tiempo real
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, "hotel:lobby", {
        :"reserva:update",
        Map.put(payload, :evento, tipo_evento)
      })
    end
  end

  # Obtiene una reserva por ID con sus relaciones precargadas
  def obtener(id) do
    case Repo.get(ReservaEsquema, id) |> Repo.preload([:huesped, :habitacion]) do
      nil -> {:error, :not_found}
      reserva -> {:ok, to_domain(reserva)}
    end
  end

  # Crea una nueva reserva, precarga relaciones y emite broadcast
  def crear(attrs) do
    with {:ok, reserva} <- %ReservaEsquema{} |> ReservaEsquema.changeset(attrs) |> Repo.insert() do
      reserva_loaded = Repo.preload(reserva, [:huesped, :habitacion])
      reserva_domain = to_domain(reserva_loaded)
      broadcast_cambio("reserva_creada", serialize(reserva_domain))
      {:ok, reserva_domain}
    end
  end

  # Lista reservas activas con filtros opcionales, ordenadas por fecha descendente
  def listar(filtros \\ %{}) do
    ReservaEsquema
    |> where([r], r.eliminado == false)
    |> aplicar_filtros(filtros)
    |> order_by([r], desc: r.inserted_at)
    |> preload([:huesped, :habitacion])
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  # Actualiza solo el estado de una reserva validando la transición en el dominio
  def actualizar_estado(id, nuevo_estado) do
    with {:ok, reserva} <- obtener(id),
         {:ok, _} <- Reserva.validar_transicion(reserva, nuevo_estado),
         reserva_esquema = from_domain(reserva),
         {:ok, updated} <- reserva_esquema |> ReservaEsquema.changeset(%{estado: nuevo_estado}) |> Repo.update() do
      updated_domain = to_domain(updated)
      broadcast_cambio("reserva_actualizada", serialize(updated_domain))
      {:ok, updated_domain}
    end
  end

  # Actualiza atributos arbitrarios de una reserva existente
  def actualizar(id, attrs) do
    with {:ok, reserva} <- obtener(id),
         reserva_esquema = from_domain(reserva),
         {:ok, updated} <- reserva_esquema |> ReservaEsquema.changeset(attrs) |> Repo.update() do
      updated_domain = to_domain(updated)
      broadcast_cambio("reserva_actualizada", serialize(updated_domain))
      {:ok, updated_domain}
    end
  end

  # Actualiza exclusivamente el total de una reserva
  def actualizar_total(id, total) do
    with {:ok, reserva} <- obtener(id),
         reserva_esquema = from_domain(reserva),
         {:ok, updated} <- reserva_esquema |> ReservaEsquema.changeset(%{total: total}) |> Repo.update() do
      updated_domain = to_domain(updated)
      broadcast_cambio("reserva_actualizada", serialize(updated_domain))
      {:ok, updated_domain}
    end
  end

  # Retorna reservas activas (confirmadas o con check-in) para la fecha actual
  def reservas_activas_hoy do
    hoy = Date.utc_today()

    from(r in ReservaEsquema,
      where: r.estado in ["confirmada", "checked_in"],
      where: r.fecha_entrada <= ^hoy,
      where: r.fecha_salida >= ^hoy,
      preload: [:huesped, :habitacion]
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  # Retorna reservas con entrada o salida programada para hoy
  def reservas_del_dia do
    hoy = Date.utc_today()

    from(r in ReservaEsquema,
      where: r.fecha_entrada == ^hoy or r.fecha_salida == ^hoy,
      preload: [:huesped, :habitacion],
      order_by: r.fecha_entrada
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  # Aplica filtros dinámicos a la query de reservas
  defp aplicar_filtros(query, filtros) do
    Enum.reduce(filtros, query, fn
      {"estado", estado}, q -> where(q, [r], r.estado == ^estado)
      {"huesped_id", hid}, q -> where(q, [r], r.huesped_id == ^hid)
      {"fecha_entrada", fecha}, q -> where(q, [r], r.fecha_entrada == ^fecha)
      _, q -> q
    end)
  end

  # Serializa el struct de dominio a mapa plano para broadcast
  defp serialize(%{} = r) do
    %{
      id: r.id,
      huesped_id: r.huesped_id,
      habitacion_id: r.habitacion_id,
      fecha_entrada: r.fecha_entrada,
      fecha_salida: r.fecha_salida,
      estado: r.estado,
      total: r.total,
      notas: r.notas,
      inserted_at: r.inserted_at
    }
  end

  # Convierte esquema de persistencia a struct de dominio
  defp to_domain(%ReservaEsquema{} = s) do
    struct(Reserva, Map.from_struct(s))
  end

  # Convierte struct de dominio a esquema de persistencia
  defp from_domain(%Reserva{} = d) do
    struct(ReservaEsquema, Map.from_struct(d))
  end
end
