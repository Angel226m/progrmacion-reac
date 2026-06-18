defmodule HotelFluxWeb.CheckoutController do
  use Phoenix.Controller
  alias HotelFlux.UseCases.CheckoutUseCase

  def realizar_checkout(conn, %{"reserva_id" => reserva_id}) do
    usuario = Guardian.Plug.current_resource(conn)
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    case CheckoutUseCase.ejecutar(reserva_id, usuario, ip) do
      {:ok, resultado} ->
        conn |> json(%{
          ok: true,
          total_final: to_string(resultado.total_final),
          habitacion_numero: resultado.habitacion.numero,
          tarea_limpieza_id: resultado.tarea_limpieza.id
        })

      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end
end
