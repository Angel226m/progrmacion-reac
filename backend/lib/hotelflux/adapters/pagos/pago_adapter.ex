defmodule HotelFlux.Adapters.Pagos.PagoAdapter do
  @moduledoc """
  🔴 ADAPTADOR SIMULADO — Solo para desarrollo/test.

  NO USAR EN PRODUCCIÓN. En producción debe reemplazarse por un
  adaptador real (Stripe, PayPal, Culqi) que implemente el puerto
  `HotelFlux.Ports.PagoPort`.

  Para intercambiar el adaptador:
    1. Crear un nuevo módulo que implemente `@behaviour PagoPort`
    2. Configurar en runtime.exs: `config :hotelflux, :pago_adapter, MiAdapter`
    3. Cambiar las referencias en reserva_saga.ex para usar el adapter configurado
  """

  @behaviour HotelFlux.Ports.PagoPort

  alias HotelFlux.Repo
  alias HotelFlux.Domain.Pago

  require Logger

  defp advertencia_produccion do
    if Application.get_env(:hotelflux, :env) == :prod do
      Logger.error("[PagoAdapter] ADAPTADOR SIMULADO USADO EN PRODUCCIÓN — configure un adaptador real")
    end
  end

  @impl true
  def procesar_pago(params) do
    advertencia_produccion()

    if :rand.uniform(100) <= 90 do
      attrs = %{
        reserva_id: params[:reserva_id] || params["reserva_id"],
        monto: params[:monto] || params["monto"],
        metodo: params[:metodo] || params["metodo"] || "tarjeta",
        estado: "completado",
        referencia_externa: "PAY-#{UUID.uuid4() |> String.slice(0..7)}"
      }

      %Pago{}
      |> Pago.changeset(attrs)
      |> Repo.insert()
    else
      Logger.warning("[PagoAdapter] Pago rechazado (simulación)")
      {:error, :pago_fallido}
    end
  end

  @impl true
  def reversar_pago(pago_id) do
    advertencia_produccion()

    case Repo.get(Pago, pago_id) do
      nil ->
        {:error, :not_found}

      pago ->
        pago
        |> Pago.changeset(%{estado: "reversado"})
        |> Repo.update()
    end
  end
end