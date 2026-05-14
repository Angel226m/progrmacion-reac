defmodule HotelFlux.Adapters.Repos.ReservaRepo do
  @moduledoc """
  Adaptador — Repositorio de reservas.

  ## Observable Repository Pattern
  Tras cada mutación exitosa, emite broadcast vía PubSub al topic "reservas".
  El Channel "hotel:lobby" re-envía el evento al frontend por WebSocket.
  El frontend RxJS acumula con `scan` — el mapa de reservas se actualiza reactivamente.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Reserva

  @topic_cambios "reservas"

  def topic_cambios, do: @topic_cambios

  def suscribir_cambios(_opts \\ %{}) do
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, @topic_cambios)
  end

  def broadcast_cambio(tipo_evento, payload) do
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, @topic_cambios, {
      String.to_atom(tipo_evento),
      payload
    })
    # También al topic "hotel:lobby" para el canal general
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "hotel:lobby", {
      :"reserva:update",
      Map.put(payload, :evento, tipo_evento)
    })
  end

  def obtener(id) do
    case Repo.get(Reserva, id) |> Repo.preload([:huesped, :habitacion]) do
      nil -> {:error, :not_found}
      reserva -> {:ok, reserva}
    end
  end

  def crear(attrs) do
    with {:ok, reserva} <- %Reserva{} |> Reserva.changeset(attrs) |> Repo.insert() do
      reserva_loaded = Repo.preload(reserva, [:huesped, :habitacion])
      broadcast_cambio("reserva_creada", serialize(reserva_loaded))
      {:ok, reserva_loaded}
    end
  end

  def listar(filtros \\ %{}) do
    Reserva
    |> where([r], r.eliminado == false)
    |> aplicar_filtros(filtros)
    |> order_by([r], desc: r.inserted_at)
    |> preload([:huesped, :habitacion])
    |> Repo.all()
  end

  def actualizar_estado(id, nuevo_estado) do
    with {:ok, reserva} <- obtener(id),
         {:ok, updated} <- reserva |> Reserva.changeset(%{estado: nuevo_estado}) |> Repo.update() do
      updated_loaded = Repo.preload(updated, [:huesped, :habitacion])
      broadcast_cambio("reserva_actualizada", serialize(updated_loaded))
      {:ok, updated_loaded}
    end
  end

  def actualizar_total(id, total) do
    with {:ok, reserva} <- obtener(id),
         {:ok, updated} <- reserva |> Reserva.changeset(%{total: total}) |> Repo.update() do
      broadcast_cambio("reserva_actualizada", serialize(updated))
      {:ok, updated}
    end
  end

  def reservas_activas_hoy do
    hoy = Date.utc_today()

    from(r in Reserva,
      where: r.estado in ["confirmada", "checked_in"],
      where: r.fecha_entrada <= ^hoy,
      where: r.fecha_salida >= ^hoy,
      preload: [:huesped, :habitacion]
    )
    |> Repo.all()
  end

  def reservas_del_dia do
    hoy = Date.utc_today()

    from(r in Reserva,
      where: r.fecha_entrada == ^hoy or r.fecha_salida == ^hoy,
      preload: [:huesped, :habitacion],
      order_by: r.fecha_entrada
    )
    |> Repo.all()
  end

  defp aplicar_filtros(query, filtros) do
    Enum.reduce(filtros, query, fn
      {"estado", estado}, q -> where(q, [r], r.estado == ^estado)
      {"huesped_id", hid}, q -> where(q, [r], r.huesped_id == ^hid)
      {"fecha_entrada", fecha}, q -> where(q, [r], r.fecha_entrada == ^fecha)
      _, q -> q
    end)
  end

  defp serialize(%Reserva{} = r) do
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
end
