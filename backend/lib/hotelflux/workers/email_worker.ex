defmodule HotelFlux.Workers.EmailWorker do
  @moduledoc """
  Oban Worker — Reintento reactivo de emails.
  Si la Saga falla en el paso de email, este worker reintenta automáticamente.
  Demuestra: retry reactivo con backoff exponencial.
  """
  use Oban.Worker, queue: :email, max_attempts: 5

  alias HotelFlux.Adapters.Repos.ReservaRepo
  alias HotelFlux.Adapters.Email.EmailAdapter

  @impl Oban.Worker
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
