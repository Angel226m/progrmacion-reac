defmodule HotelFlux.Adapters.Repos.ReservaServicioRepo do
  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.ReservaServicio

  @topic_cambios "reservas_servicios"

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
      :"reserva:servicio_update",
      Map.put(payload, :evento, tipo_evento)
    })
  end

  def obtener(id) do
    case Repo.get(ReservaServicio, id) |> Repo.preload(:producto) do
      nil -> {:error, :not_found}
      rs -> {:ok, rs}
    end
  end

  def crear(attrs) do
    with {:ok, rs} <- %ReservaServicio{} |> ReservaServicio.changeset(attrs) |> Repo.insert() do
      rs_loaded = Repo.preload(rs, :producto)
      broadcast_cambio("servicio_agregado", serialize(rs_loaded))
      {:ok, rs_loaded}
    end
  end

  def crear_varios(attrs_list) do
    results =
      Enum.reduce_while(attrs_list, {:ok, []}, fn attrs, {:ok, acc} ->
        case crear(attrs) do
          {:ok, rs} -> {:cont, {:ok, [rs | acc]}}
          {:error, _} = err -> {:halt, err}
        end
      end)

    case results do
      {:ok, list} ->
        reserva_id = if first = List.first(list), do: first.reserva_id, else: nil
        broadcast_cambio("servicios_masivos", %{count: length(list), reserva_id: reserva_id})
        {:ok, Enum.reverse(list)}
      error -> error
    end
  end

  def por_reserva(reserva_id) do
    from(rs in ReservaServicio,
      where: rs.reserva_id == ^reserva_id,
      where: rs.eliminado == false,
      preload: :producto,
      order_by: [rs.dia_numero, rs.inserted_at]
    )
    |> Repo.all()
  end

  def por_reserva_y_dia(reserva_id, dia_numero) do
    from(rs in ReservaServicio,
      where: rs.reserva_id == ^reserva_id,
      where: rs.dia_numero == ^dia_numero,
      where: rs.eliminado == false,
      preload: :producto,
      order_by: [rs.inserted_at]
    )
    |> Repo.all()
  end

  def agrupado_por_dia(reserva_id) do
    por_reserva(reserva_id)
    |> Enum.group_by(& &1.dia_numero)
  end

  def total_por_reserva(reserva_id) do
    from(rs in ReservaServicio,
      where: rs.reserva_id == ^reserva_id,
      where: rs.estado != "cancelado",
      where: rs.eliminado == false,
      select: coalesce(sum(rs.total), ^Decimal.new("0"))
    )
    |> Repo.one() || Decimal.new(0)
  end

  def actualizar_estado(id, estado) do
    with {:ok, rs} <- obtener(id),
         {:ok, updated} <- rs |> ReservaServicio.changeset(%{estado: estado}) |> Repo.update() do
      updated_loaded = Repo.preload(updated, :producto)
      broadcast_cambio("servicio_estado_actualizado", serialize(updated_loaded))
      {:ok, updated_loaded}
    end
  end

  defp serialize(%ReservaServicio{} = rs) do
    %{
      id: rs.id,
      reserva_id: rs.reserva_id,
      producto_id: rs.producto_id,
      producto_nombre: rs.producto && rs.producto.nombre,
      categoria: rs.producto && rs.producto.categoria,
      dia_numero: rs.dia_numero,
      cantidad: rs.cantidad,
      precio_unitario: rs.precio_unitario,
      total: rs.total,
      es_adicional: rs.es_adicional,
      estado: rs.estado,
      fecha_servicio: rs.fecha_servicio,
      inserted_at: rs.inserted_at
    }
  end
end
