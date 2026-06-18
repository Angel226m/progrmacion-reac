defmodule HotelFluxWeb.TareaController do
  use Phoenix.Controller
  alias HotelFlux.UseCases.AsignarLimpiezaUseCase

  defp serializar_tarea(t) do
    habitacion = case Ecto.assoc_loaded?(t.habitacion) do
      true -> %{id: t.habitacion.id, numero: t.habitacion.numero, piso: t.habitacion.piso, tipo: t.habitacion.tipo}
      false -> nil
    end

    %{
      id: t.id,
      habitacion_id: t.habitacion_id,
      empleado_id: t.empleado_id,
      estado: t.estado,
      prioridad: t.prioridad,
      notas: t.notas,
      inserted_at: t.inserted_at,
      iniciada_at: t.iniciada_en,
      completada_at: t.completada_en,
      habitacion: habitacion
    }
  end

  def actualizar_estado(conn, %{"id" => id, "estado" => estado}) do
    usuario = Guardian.Plug.current_resource(conn)
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    case AsignarLimpiezaUseCase.actualizar_estado(id, estado, usuario, ip) do
      {:ok, tarea} ->
        conn |> json(%{ok: true, tarea: serializar_tarea(tarea)})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end
end
