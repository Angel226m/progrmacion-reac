defmodule HotelFluxWeb.ProductoController do
  use Phoenix.Controller
  alias HotelFlux.Adapters.Repos.ProductoRepo
  alias HotelFlux.UseCases.VentaProductoUseCase

  def crear(conn, params) do
    case ProductoRepo.crear(params) do
      {:ok, producto} ->
        conn |> put_status(201) |> json(%{ok: true, producto: serialize(producto)})
      {:error, changeset} ->
        conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
    end
  end

  def vender(conn, params) do
    case VentaProductoUseCase.ejecutar(params) do
      {:ok, consumo} ->
        conn |> put_status(201) |> json(%{ok: true, consumo_id: consumo.id, total: to_string(consumo.total)})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  def actualizar(conn, %{"id" => id} = params) do
    case ProductoRepo.actualizar(id, params) do
      {:ok, producto} ->
        conn |> json(%{ok: true, producto: serialize(producto)})
      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{error: "Producto no encontrado"})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  def eliminar(conn, %{"id" => id}) do
    case ProductoRepo.eliminar(id) do
      {:ok, _} ->
        conn |> json(%{ok: true})
      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{error: "Producto no encontrado"})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  defp serialize(p) do
    %{id: p.id, nombre: p.nombre, descripcion: p.descripcion, categoria: p.categoria,
      precio: to_string(p.precio), disponible: p.disponible, stock: p.stock}
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
