defmodule HotelFlux.Adapters.Pagos.PagoAdapter do
  @moduledoc """
  Adaptador SIMULADO de pagos — Solo para desarrollo/test.

  En producción debe reemplazarse por un adaptador real (Stripe, PayPal, Culqi)
  que implemente `HotelFlux.Ports.PagoPort`.
  """

  @behaviour HotelFlux.Ports.PagoPort

  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Pago, as: PagoEsquema

  require Logger

  defp advertencia_produccion do
    :prod |> Mix.env() |> maybe_log_error()
  end

  defp maybe_log_error(:prod), do: Logger.error("[PagoAdapter] ADAPTADOR SIMULADO USADO EN PRODUCCIÓN")
  defp maybe_log_error(_), do: :ok

  @impl true
  def procesar_pago(params) do
    advertencia_produccion()

    attrs = %{
      reserva_id: params[:reserva_id] || params["reserva_id"],
      monto: params[:monto] || params["monto"],
      metodo: params[:metodo] || params["metodo"] || "tarjeta",
      estado: "completado",
      referencia_externa: "PAY-#{UUID.uuid4() |> String.slice(0..7)}"
    }

    %PagoEsquema{}
    |> PagoEsquema.changeset(attrs)
    |> Repo.insert()
  end

  @impl true
  def reversar_pago(pago_id) do
    advertencia_produccion()

    case Repo.get(PagoEsquema, pago_id) do
      nil -> {:error, :not_found}
      pago ->
        pago
        |> PagoEsquema.changeset(%{estado: "reversado"})
        |> Repo.update()
    end
  end
end
