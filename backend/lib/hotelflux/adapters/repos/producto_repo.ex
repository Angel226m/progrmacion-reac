defmodule HotelFlux.Adapters.Repos.ProductoRepo do
  @moduledoc "Adaptador — Repositorio de productos."

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Producto

  def obtener(id) do
    case Repo.get(Producto, id) do
      nil -> {:error, :not_found}
      producto -> {:ok, producto}
    end
  end

  def crear(attrs) do
    %Producto{}
    |> Producto.changeset(attrs)
    |> Repo.insert()
  end

  def actualizar(id, attrs) do
    with {:ok, producto} <- obtener(id) do
      producto
      |> Producto.changeset(attrs)
      |> Repo.update()
    end
  end

  def eliminar(id) do
    with {:ok, producto} <- obtener(id) do
      now = DateTime.utc_now()
      producto
      |> Ecto.Changeset.change(%{eliminado: true, eliminado_en: now})
      |> Repo.update()
    end
  end

  def listar(filtros \\ %{}) do
    Producto
    |> where([p], p.eliminado == false)
    |> aplicar_filtros(filtros)
    |> where([p], p.disponible == true)
    |> order_by([p], [p.categoria, p.nombre])
    |> Repo.all()
  end

  def por_categoria(categoria) do
    from(p in Producto,
      where: p.categoria == ^categoria and p.disponible == true and p.eliminado == false,
      order_by: p.nombre
    )
    |> Repo.all()
  end

  @doc "Top productos más vendidos — para dashboard."
  def top_vendidos(limite \\ 10) do
    from(c in HotelFlux.Domain.Consumo,
      join: p in HotelFlux.Domain.Producto, on: c.producto_id == p.id,
      group_by: [p.id, p.nombre, p.categoria],
      order_by: [desc: sum(c.cantidad)],
      select: %{
        producto_id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        total_vendido: sum(c.cantidad),
        ingresos: sum(c.total)
      },
      limit: ^limite
    )
    |> Repo.all()
  end

  defp aplicar_filtros(query, filtros) do
    Enum.reduce(filtros, query, fn
      {"categoria", cat}, q -> where(q, [p], p.categoria == ^cat)
      _, q -> q
    end)
  end
end
