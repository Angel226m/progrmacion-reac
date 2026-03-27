defmodule HotelFlux.Adapters.Repos.ReservaRepo do
  @moduledoc """
  Adaptador — Repositorio de reservas.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Reserva

  def obtener(id) do
    case Repo.get(Reserva, id) |> Repo.preload([:huesped, :habitacion]) do
      nil -> {:error, :not_found}
      reserva -> {:ok, reserva}
    end
  end

  def crear(attrs) do
    %Reserva{}
    |> Reserva.changeset(attrs)
    |> Repo.insert()
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
    with {:ok, reserva} <- obtener(id) do
      reserva
      |> Reserva.changeset(%{estado: nuevo_estado})
      |> Repo.update()
    end
  end

  def actualizar_total(id, total) do
    with {:ok, reserva} <- obtener(id) do
      reserva
      |> Reserva.changeset(%{total: total})
      |> Repo.update()
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
end
