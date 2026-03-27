defmodule HotelFluxWeb.TareaController do
  use Phoenix.Controller
  alias HotelFlux.UseCases.AsignarLimpiezaUseCase

  def actualizar_estado(conn, %{"id" => id, "estado" => estado}) do
    case AsignarLimpiezaUseCase.actualizar_estado(id, estado) do
      {:ok, tarea} ->
        conn |> json(%{ok: true, tarea_id: tarea.id, estado: tarea.estado})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end
end
