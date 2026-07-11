defmodule HotelFlux.Adapters.Repos.ConsumoRepo do
  @moduledoc "Adaptador — Repositorio de consumos."

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Consumo, as: ConsumoEsquema
  alias HotelFlux.Domain.Consumo

  def crear(attrs) do
    %ConsumoEsquema{}
    |> ConsumoEsquema.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, consumo} -> {:ok, to_domain(consumo)}
      {:error, _} = err -> err
    end
  end

  def por_reserva(reserva_id) do
    from(c in ConsumoEsquema,
      where: c.reserva_id == ^reserva_id,
      preload: :producto,
      order_by: [desc: c.inserted_at]
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc "Calcula total de consumos de una reserva. Función pura de cálculo."
  def total_por_reserva(reserva_id) do
    from(c in ConsumoEsquema,
      where: c.reserva_id == ^reserva_id,
      where: c.estado != "cancelado",
      select: coalesce(sum(c.total), ^Decimal.new("0"))
    )
    |> Repo.one() || Decimal.new(0)
  end

  @doc "Ingresos del día por consumos."
  def ingresos_hoy do
    hoy_inicio = DateTime.new!(Date.utc_today(), ~T[00:00:00], "Etc/UTC")

    from(c in ConsumoEsquema,
      where: c.inserted_at >= ^hoy_inicio,
      where: c.estado != "cancelado",
      select: coalesce(sum(c.total), 0)
    )
    |> Repo.one() || Decimal.new(0)
  end

  defp to_domain(%ConsumoEsquema{} = s) do
    struct(Consumo, Map.from_struct(s))
  end
end
