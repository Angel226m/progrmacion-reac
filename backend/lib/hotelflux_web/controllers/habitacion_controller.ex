defmodule HotelFluxWeb.HabitacionController do
  @moduledoc """
  Controlador de habitaciones — CRUD de habitaciones de hotel.
  Permite crear, actualizar, cambiar estado, eliminar y generar habitaciones en lote.
  """
  use Phoenix.Controller
  alias HotelFlux.Adapters.Repos.HabitacionRepo

  @doc """
  POST /habitaciones — Crea una nueva habitación.
  """
  def crear(conn, params) do
    case HabitacionRepo.crear(params) do
      {:ok, habitacion} ->
        conn |> put_status(201) |> json(%{ok: true, habitacion: serialize(habitacion)})
      {:error, changeset} ->
        conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
    end
  end

  @doc """
  PUT /habitaciones/:id/estado — Cambia el estado de una habitación (disponible, ocupada, limpieza, mantenimiento).
  Publica el cambio por PubSub para actualizaciones en tiempo real.
  """
  def cambiar_estado(conn, %{"id" => id, "estado" => estado}) do
    case HabitacionRepo.cambiar_estado(id, estado) do
      {:ok, habitacion} ->
        # Notifica a todos los clientes conectados sobre el cambio de estado
        Phoenix.PubSub.broadcast(HotelFlux.PubSub, "habitaciones", {
          :habitacion_actualizada,
          %{id: habitacion.id, numero: habitacion.numero, estado: habitacion.estado, piso: habitacion.piso}
        })
        conn |> json(%{ok: true, habitacion: serialize(habitacion)})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  @doc """
  PUT /habitaciones/:id — Actualiza los datos de una habitación.
  """
  def actualizar(conn, %{"id" => id} = params) do
    case HabitacionRepo.actualizar(id, params) do
      {:ok, habitacion} ->
        conn |> json(%{ok: true, habitacion: serialize(habitacion)})
      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{error: "Habitación no encontrada"})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  @doc """
  DELETE /habitaciones/:id — Elimina lógicamente una habitación.
  """
  def eliminar(conn, %{"id" => id}) do
    case HabitacionRepo.eliminar(id) do
      {:ok, _} ->
        conn |> json(%{ok: true})
      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{error: "Habitación no encontrada"})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  @doc """
  POST /habitaciones/generar — Genera múltiples habitaciones en lote para un piso y tipo dados.
  Útil para inicializar un piso completo del hotel.
  """
  def generar(conn, params) do
    piso = params["piso"]
    cantidad = params["cantidad"]
    tipo = params["tipo"]

    case {is_nil(piso), is_nil(cantidad), is_nil(tipo)} do
      {true, _, _} -> conn |> put_status(422) |> json(%{error: "Falta piso"})
      {_, true, _} -> conn |> put_status(422) |> json(%{error: "Falta cantidad"})
      {_, _, true} -> conn |> put_status(422) |> json(%{error: "Falta tipo"})
      {false, false, false} ->
        case HabitacionRepo.generar(piso, cantidad, tipo) do
          {:ok, habitaciones} ->
            conn |> put_status(201) |> json(%{ok: true, habitaciones: Enum.map(habitaciones, &serialize/1)})
          {:error, reason} ->
            conn |> put_status(422) |> json(%{error: to_string(reason)})
        end
    end
  end

  # Serializa una habitación a un mapa plano para la respuesta JSON
  defp serialize(h) do
    %{id: h.id, numero: h.numero, tipo: h.tipo, piso: h.piso, capacidad: h.capacidad,
      precio_noche: to_string(h.precio_noche), estado: h.estado, caracteristicas: h.caracteristicas}
  end

  # Traduce los errores de validación de Ecto a un mapa de strings legible
  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
