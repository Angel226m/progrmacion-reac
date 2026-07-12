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

  @topic_cambios "reservas"

  def topic_cambios, do: @topic_cambios

  def suscribir_cambios(_opts \\ %{}) do
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, @topic_cambios)
  end

  @known_events %{
    "reserva_creada" => :reserva_creada,
    "reserva_actualizada" => :reserva_actualizada
  }

  def broadcast_cambio(tipo_evento, payload) do
    with {:ok, atom} <- Map.fetch(@known_events, tipo_evento) do
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, @topic_cambios, {atom, payload})
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, "hotel:lobby", {
        :"reserva:update",
        Map.put(payload, :evento, tipo_evento)
      })
    end
  end

  def obtener(id) do
    case Repo.get(ReservaEsquema, id) |> Repo.preload([:huesped, :habitacion]) do
      nil -> {:error, :not_found}
      reserva -> {:ok, to_domain(reserva)}
    end
  end

  def crear(attrs) do
    with {:ok, reserva} <- %ReservaEsquema{} |> ReservaEsquema.changeset(attrs) |> Repo.insert() do
      reserva_loaded = Repo.preload(reserva, [:huesped, :habitacion])
      reserva_domain = to_domain(reserva_loaded)
      broadcast_cambio("reserva_creada", serialize(reserva_domain))
      {:ok, reserva_domain}
    end
  end

  def listar(filtros \\ %{}) do
    ReservaEsquema
    |> where([r], r.eliminado == false)
    |> aplicar_filtros(filtros)
    |> order_by([r], desc: r.inserted_at)
    |> preload([:huesped, :habitacion])
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

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

  def actualizar(id, attrs) do
    with {:ok, reserva} <- obtener(id),
         reserva_esquema = from_domain(reserva),
         {:ok, updated} <- reserva_esquema |> ReservaEsquema.changeset(attrs) |> Repo.update() do
      updated_domain = to_domain(updated)
      broadcast_cambio("reserva_actualizada", serialize(updated_domain))
      {:ok, updated_domain}
    end
  end

  def actualizar_total(id, total) do
    with {:ok, reserva} <- obtener(id),
         reserva_esquema = from_domain(reserva),
         {:ok, updated} <- reserva_esquema |> ReservaEsquema.changeset(%{total: total}) |> Repo.update() do
      updated_domain = to_domain(updated)
      broadcast_cambio("reserva_actualizada", serialize(updated_domain))
      {:ok, updated_domain}
    end
  end

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

  defp aplicar_filtros(query, filtros) do
    Enum.reduce(filtros, query, fn
      {"estado", estado}, q -> where(q, [r], r.estado == ^estado)
      {"huesped_id", hid}, q -> where(q, [r], r.huesped_id == ^hid)
      {"fecha_entrada", fecha}, q -> where(q, [r], r.fecha_entrada == ^fecha)
      _, q -> q
    end)
  end

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

  defp to_domain(%ReservaEsquema{} = s) do
    struct(Reserva, Map.from_struct(s))
  end

  defp from_domain(%Reserva{} = d) do
    struct(ReservaEsquema, Map.from_struct(d))
  end
end
