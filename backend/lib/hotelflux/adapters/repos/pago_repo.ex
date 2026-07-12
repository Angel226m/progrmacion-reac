defmodule HotelFlux.Adapters.Repos.PagoRepo do
  @moduledoc """
  Adaptador — Repositorio de pagos.
  """
  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Pago, as: PagoEsquema

  def obtener(id) do
    case Repo.get(PagoEsquema, id) do
      nil -> {:error, :not_found}
      pago -> {:ok, pago}
    end
  end

  def actualizar(%PagoEsquema{} = pago, attrs) do
    pago
    |> PagoEsquema.changeset(attrs)
    |> Repo.update()
  end
end
