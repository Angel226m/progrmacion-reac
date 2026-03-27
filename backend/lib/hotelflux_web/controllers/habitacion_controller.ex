defmodule HotelFluxWeb.HabitacionController do
  use Phoenix.Controller
  alias HotelFlux.Adapters.Repos.HabitacionRepo

  def crear(conn, params) do
    case HabitacionRepo.crear(params) do
      {:ok, habitacion} ->
        conn |> put_status(201) |> json(%{ok: true, habitacion: serialize(habitacion)})
      {:error, changeset} ->
        conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
    end
  end

  def cambiar_estado(conn, %{"id" => id, "estado" => estado}) do
    case HabitacionRepo.cambiar_estado(id, estado) do
      {:ok, habitacion} ->
        Phoenix.PubSub.broadcast(HotelFlux.PubSub, "habitaciones", {
          :habitacion_actualizada,
          %{id: habitacion.id, numero: habitacion.numero, estado: habitacion.estado, piso: habitacion.piso}
        })
        conn |> json(%{ok: true, habitacion: serialize(habitacion)})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  defp serialize(h) do
    %{id: h.id, numero: h.numero, tipo: h.tipo, piso: h.piso, capacidad: h.capacidad,
      precio_noche: to_string(h.precio_noche), estado: h.estado, caracteristicas: h.caracteristicas}
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
