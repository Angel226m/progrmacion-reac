defmodule HotelFlux.Adapters.Pagos.PagoAdapter do
  @moduledoc """
  Adaptador de pagos — Simulado para desarrollo.
  En producción se reemplazaría por Stripe/PayPal sin cambiar el dominio.
  Demuestra: Arquitectura hexagonal — el dominio no conoce la implementación.
  """

  alias HotelFlux.Repo
  alias HotelFlux.Domain.Pago

  require Logger

  @doc """
  Procesa un pago (simulado).
  Simula un éxito al 90% para demostrar la compensación de la Saga.
  """
  def procesar_pago(params) do
    # Simulación: 90% éxito, 10% fallo (para demostrar compensación)
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

  @doc "Reversa un pago. Compensación de la Saga."
  def reversar_pago(pago_id) do
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
