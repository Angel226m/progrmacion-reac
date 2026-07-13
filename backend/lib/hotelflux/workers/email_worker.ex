defmodule HotelFlux.Workers.EmailWorker do
  @moduledoc """
  Worker de Oban — Reintento reactivo de emails de confirmación.

  Si la Saga falla en el paso de envío de email, este worker reintenta
  automáticamente con backoff exponencial (hasta 5 intentos).
  """

  use Oban.Worker, queue: :email, max_attempts: 5

  alias HotelFlux.Adapters.Repos.ReservaRepo
  alias HotelFlux.Adapters.Email.EmailAdapter

  @impl Oban.Worker
  # Ejecuta el envío del email de confirmación para una reserva
  def perform(%Oban.Job{args: %{"reserva_id" => reserva_id}}) do
    case ReservaRepo.obtener(reserva_id) do
      {:ok, reserva} ->
        case EmailAdapter.enviar_email_confirmacion(reserva) do
          {:ok, _} -> :ok
          {:error, reason} -> {:error, reason}
        end

      {:error, _} ->
        {:error, :reserva_no_encontrada}
    end
  end
end
