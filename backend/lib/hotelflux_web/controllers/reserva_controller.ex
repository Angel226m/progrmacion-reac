defmodule HotelFluxWeb.ReservaController do
  @moduledoc "Controller de Commands — Reservas (dispara Saga reactiva)."
  use Phoenix.Controller
  alias HotelFlux.UseCases.Saga.ReservaSaga
  alias HotelFlux.Adapters.Repos.{ReservaRepo, HuespedRepo}

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

  @doc """
  Reserva directa desde Recepción — crea el huésped si no existe y
  luego ejecuta la Saga completa.

  Payload esperado:
    - habitacion_id (requerido)
    - fecha_entrada, fecha_salida, metodo_pago (requeridos)
    - huesped_id  (si el huésped ya existe)
    - nombre, apellido, email, telefono, documento_identidad, nacionalidad
      (si es un huésped nuevo)
    - notas (opcional)
  """
  def directa(conn, params) do
    with {:ok, huesped_id} <- resolver_huesped(params),
         saga_params        = Map.put(params, "huesped_id", huesped_id),
         {:ok, resultado}  <- ReservaSaga.ejecutar(saga_params) do
      conn |> put_status(201) |> json(%{
        ok: true,
        saga_id: resultado.saga_id,
        reserva: serialize_reserva(resultado.reserva),
        huesped: %{id: huesped_id}
      })
    else
      {:error, :huesped_invalido, reason} ->
        conn |> put_status(422) |> json(%{ok: false, error: "No se pudo crear el huésped: #{reason}"})

      {:error, resultado} when is_map(resultado) ->
        conn |> put_status(422) |> json(%{ok: false, saga_id: resultado[:saga_id], error: resultado[:error]})

      {:error, reason} ->
        conn |> put_status(422) |> json(%{ok: false, error: to_string(reason)})
    end
  end

  # Si ya viene huesped_id, lo usamos directamente.
  # Si no, creamos el huésped con los datos del formulario.
  defp resolver_huesped(%{"huesped_id" => id}) when is_binary(id) and id != "" do
    {:ok, id}
  end
  defp resolver_huesped(params) do
    attrs = %{
      nombre:              params["nombre"]              || "",
      apellido:            params["apellido"]            || "",
      email:               params["email"]               || "",
      telefono:            params["telefono"],
      documento:           params["documento_identidad"] || params["documento"],
      nacionalidad:        params["nacionalidad"]
    }
    case HuespedRepo.crear(attrs) do
      {:ok, huesped} -> {:ok, huesped.id}
      {:error, changeset} ->
        errors = Ecto.Changeset.traverse_errors(changeset, fn {msg, _} -> msg end)
        {:error, :huesped_invalido, inspect(errors)}
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

  def actualizar(conn, %{"id" => id} = params) do
    case ReservaRepo.actualizar(id, params) do
      {:ok, reserva} ->
        conn |> json(%{ok: true, reserva: serialize_reserva(reserva)})
      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{error: "Reserva no encontrada"})
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
