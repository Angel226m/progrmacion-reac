defmodule HotelFlux.Adapters.Repos.ConsumoRepo do
  @moduledoc "Adaptador — Repositorio de consumos."

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Consumo

  def crear(attrs) do
    %Consumo{}
    |> Consumo.changeset(attrs)
    |> Repo.insert()
  end

  def por_reserva(reserva_id) do
    from(c in Consumo,
      where: c.reserva_id == ^reserva_id,
      preload: :producto,
      order_by: [desc: c.inserted_at]
    )
    |> Repo.all()
  end

  @doc "Calcula total de consumos de una reserva. Función pura de cálculo."
  def total_por_reserva(reserva_id) do
    from(c in Consumo,
      where: c.reserva_id == ^reserva_id,
      where: c.estado != "cancelado",
      select: coalesce(sum(c.total), 0)
    )
    |> Repo.one() || Decimal.new(0)
  end

  @doc "Ingresos del día por consumos."
  def ingresos_hoy do
    hoy_inicio = DateTime.new!(Date.utc_today(), ~T[00:00:00], "Etc/UTC")

    from(c in Consumo,
      where: c.inserted_at >= ^hoy_inicio,
      where: c.estado != "cancelado",
      select: coalesce(sum(c.total), 0)
    )
    |> Repo.one() || Decimal.new(0)
  end
end
