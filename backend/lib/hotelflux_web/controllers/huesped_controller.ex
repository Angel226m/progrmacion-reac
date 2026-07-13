defmodule HotelFluxWeb.HuespedController do
  @moduledoc """
  Controlador de huéspedes — CRUD de huéspedes del hotel.
  Permite crear, actualizar y eliminar registros de huéspedes.
  """
  use Phoenix.Controller
  alias HotelFlux.Adapters.Repos.HuespedRepo

  # POST /huespedes — Crea un nuevo huésped
  def crear(conn, params) do
    case HuespedRepo.crear(params) do
      {:ok, huesped} ->
        conn |> put_status(201) |> json(%{ok: true, huesped: serialize(huesped)})
      {:error, changeset} ->
        conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
    end
  end

  # PUT /huespedes/:id — Actualiza los datos de un huésped existente
  def actualizar(conn, %{"id" => id} = params) do
    case HuespedRepo.actualizar(id, params) do
      {:ok, huesped} ->
        conn |> json(%{ok: true, huesped: serialize(huesped)})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  # DELETE /huespedes/:id — Elimina lógicamente un huésped
  def eliminar(conn, %{"id" => id}) do
    case HuespedRepo.eliminar(id) do
      {:ok, _} ->
        conn |> json(%{ok: true})
      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{error: "Huésped no encontrado"})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  # Serializa un huésped a un mapa plano para la respuesta JSON
  defp serialize(h) do
    %{id: h.id, nombre: h.nombre, apellido: h.apellido, email: h.email,
      telefono: h.telefono, documento: h.documento, nacionalidad: h.nacionalidad}
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
