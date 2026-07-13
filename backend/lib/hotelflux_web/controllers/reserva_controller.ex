defmodule HotelFluxWeb.ReservaController do
  @moduledoc "Controller de Commands — Reservas (dispara Saga reactiva)."
  use Phoenix.Controller
  require Logger
  alias HotelFlux.UseCases.Saga.ReservaSaga
  alias HotelFlux.Adapters.Repos.{ReservaRepo, HuespedRepo, HabitacionRepo}

  # POST /reservas — Crea una reserva mediante la Saga reactiva (transacción distribuida)
  def crear(conn, params) do
    usuario = Guardian.Plug.current_resource(conn)
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    case ReservaSaga.ejecutar(params, usuario, ip) do
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

  # POST /reservas/directa — Crea una reserva creando automáticamente el huésped si no existe
  def directa(conn, params) do
    Logger.info("[ReservaController] directa params: #{inspect(params)}")
    usuario = Guardian.Plug.current_resource(conn)
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()

    with {:ok, huesped_id} <- resolver_huesped(params) do
      saga_params = Map.put(params, "huesped_id", huesped_id)

      case ReservaSaga.ejecutar(saga_params, usuario, ip) do
        {:ok, resultado} ->
          conn |> put_status(201) |> json(%{
            ok: true,
            saga_id: resultado.saga_id,
            reserva: serialize_reserva(resultado.reserva),
            huesped: %{id: huesped_id}
          })

        {:error, error} ->
          conn |> put_status(422) |> json(%{ok: false, error: "#{inspect(error)}"})
      end
    else
      {:error, :huesped_invalido, reason} ->
        conn |> put_status(422) |> json(%{ok: false, error: "No se pudo crear el huésped: #{reason}"})

      {:error, reason} ->
        conn |> put_status(422) |> json(%{ok: false, error: to_string(reason)})
    end
  end

  defp resolver_huesped(%{"huesped_id" => id}) when is_binary(id) and byte_size(id) > 0 do
    {:ok, id}
  end

  defp resolver_huesped(params) do
    params = Map.drop(params, ["huesped_id"])
    huesped_params = params["huesped"] || %{}
    nombre   = params["nombre"]   || huesped_params["nombre"]   || ""
    apellido = params["apellido"] || huesped_params["apellido"] || ""

    case {nombre, apellido} do
      {"", _} -> {:error, :huesped_invalido, "nombre es requerido"}
      {_, ""} -> {:error, :huesped_invalido, "apellido es requerido"}
      _ ->
        attrs = %{
          nombre:       nombre,
          apellido:     apellido,
          email:        params["email"] || huesped_params["email"] || "",
          telefono:     params["telefono"] || huesped_params["telefono"],
          documento:    params["documento_identidad"] || params["documento"] || huesped_params["documento"],
          nacionalidad: params["nacionalidad"] || huesped_params["nacionalidad"]
        }

        case attrs[:email] do
          "" -> crear_huesped(attrs)
          email ->
            case HuespedRepo.buscar_por_email(email) do
              {:ok, huesped} -> {:ok, huesped.id}
              {:error, :not_found} -> crear_huesped(attrs)
            end
        end
    end
  end

  defp crear_huesped(attrs) do
    case HuespedRepo.crear(attrs) do
      {:ok, huesped} -> {:ok, huesped.id}
      {:error, changeset} ->
        errors = Ecto.Changeset.traverse_errors(changeset, fn {msg, _} -> msg end)
        {:error, :huesped_invalido, inspect(errors)}
    end
  end

  # POST /reservas/:id/cancelar — Cancela una reserva y libera la habitación
  def cancelar(conn, %{"id" => id}) do
    with {:ok, reserva} <- ReservaRepo.obtener(id),
         :ok <- validar_cancelacion(reserva) do

      case ReservaRepo.actualizar_estado(id, "cancelada") do
        {:ok, reserva_act} ->
          HabitacionRepo.cambiar_estado(reserva.habitacion_id, "disponible")
          conn |> json(%{ok: true, reserva: serialize_reserva(reserva_act)})

        {:error, reason} ->
          conn |> put_status(422) |> json(%{error: to_string(reason)})
      end
    else
      {:error, :not_found} -> conn |> put_status(404) |> json(%{error: "Reserva no encontrada"})
      {:error, :transicion_invalida} -> conn |> put_status(422) |> json(%{error: "No se puede cancelar esta reserva en su estado actual"})
      {:error, reason} -> conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  # Valida que la reserva pueda cancelarse según su estado actual
  defp validar_cancelacion(%{estado: est}) do
    case est do
      e when e in ~w(pendiente confirmada) -> :ok
      "checked_in" -> :ok
      _ -> {:error, :transicion_invalida}
    end
  end

  # PUT /reservas/:id — Actualiza los datos de una reserva existente
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

  # Serializa una reserva a un mapa seguro para respuestas JSON
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
