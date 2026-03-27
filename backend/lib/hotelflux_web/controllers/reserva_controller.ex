defmodule HotelFluxWeb.ReservaController do
  @moduledoc "Controller de Commands — Reservas (dispara Saga reactiva)."
  use Phoenix.Controller
  alias HotelFlux.UseCases.Saga.ReservaSaga
  alias HotelFlux.Adapters.Repos.ReservaRepo

  def crear(conn, params) do
    case ReservaSaga.ejecutar(params) do
      {:ok, resultado} ->
        conn |> put_status(201) |> json(%{
          ok: true,
          saga_id: resultado.saga_id,
          reserva: serialize_reserva(resultado.reserva)
        })

      {:error, resultado} ->
        conn |> put_status(422) |> json(%{
          ok: false,
          saga_id: resultado.saga_id,
          error: resultado.error
        })
    end
  end

  def cancelar(conn, %{"id" => id}) do
    case ReservaRepo.actualizar_estado(id, "cancelada") do
      {:ok, reserva} ->
        # Liberar habitación
        HotelFlux.Adapters.Repos.HabitacionRepo.cambiar_estado(reserva.habitacion_id, "disponible")
        Phoenix.PubSub.broadcast(HotelFlux.PubSub, "habitaciones", {
          :habitacion_actualizada,
          %{id: reserva.habitacion_id, estado: "disponible"}
        })
        conn |> json(%{ok: true, reserva: serialize_reserva(reserva)})

      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  defp serialize_reserva(r) do
    %{
      id: r.id,
      huesped_id: r.huesped_id,
      habitacion_id: r.habitacion_id,
      fecha_entrada: r.fecha_entrada,
      fecha_salida: r.fecha_salida,
      estado: r.estado,
      total: r.total && to_string(r.total)
    }
  end
end
