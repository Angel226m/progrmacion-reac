defmodule HotelFluxWeb.CheckinController do
  @moduledoc """
  Controlador de check-in — Procesa la entrada de un huésped.
  Marca la habitación como ocupada y registra el ingreso.
  """
  use Phoenix.Controller
  alias HotelFlux.UseCases.CheckinUseCase

  # POST /checkin — Realiza el check-in de una reserva (marca habitación como ocupada)
  def realizar_checkin(conn, %{"reserva_id" => reserva_id}) do
    usuario = Guardian.Plug.current_resource(conn)
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    case CheckinUseCase.ejecutar(reserva_id, usuario, ip) do
      {:ok, resultado} ->
        conn |> json(%{
          ok: true,
          reserva_id: resultado.reserva.id,
          habitacion: %{
            id: resultado.habitacion.id,
            numero: resultado.habitacion.numero,
            estado: resultado.habitacion.estado
          }
        })

      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end
end
