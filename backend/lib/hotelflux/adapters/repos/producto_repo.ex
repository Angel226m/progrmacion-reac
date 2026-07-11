defmodule HotelFlux.Adapters.Repos.ProductoRepo do
  @moduledoc "Adaptador — Repositorio de productos."

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Producto, as: ProductoEsquema
  alias HotelFlux.Infra.Persistence.Schema.Consumo, as: ConsumoEsquema
  alias HotelFlux.Domain.Producto

  def obtener(id) do
    case Repo.get(ProductoEsquema, id) do
      nil -> {:error, :not_found}
      producto -> {:ok, to_domain(producto)}
    end
  end

  def crear(attrs) do
    %ProductoEsquema{}
    |> ProductoEsquema.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, producto} -> {:ok, to_domain(producto)}
      {:error, _} = err -> err
    end
  end

  def actualizar(id, attrs) do
    with {:ok, producto} <- obtener(id) do
      producto
      |> from_domain()
      |> ProductoEsquema.changeset(attrs)
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, to_domain(updated)}
        {:error, _} = err -> err
      end
    end
  end

  def eliminar(id) do
    with {:ok, producto} <- obtener(id) do
      now = DateTime.utc_now()
      producto
      |> from_domain()
      |> Ecto.Changeset.change(%{eliminado: true, eliminado_en: now})
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, to_domain(updated)}
        {:error, _} = err -> err
      end
    end
  end

  def listar(filtros \\ %{}) do
    ProductoEsquema
    |> where([p], p.eliminado == false)
    |> aplicar_filtros(filtros)
    |> where([p], p.disponible == true)
    |> order_by([p], [p.categoria, p.nombre])
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  def por_categoria(categoria) do
    from(p in ProductoEsquema,
      where: p.categoria == ^categoria and p.disponible == true and p.eliminado == false,
      order_by: p.nombre
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc "Top productos más vendidos — para dashboard."
  def top_vendidos(limite \\ 10) do
    from(c in ConsumoEsquema,
      join: p in ProductoEsquema, on: c.producto_id == p.id,
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

  defp to_domain(%ProductoEsquema{} = s) do
    struct(Producto, Map.from_struct(s))
  end

  defp from_domain(%Producto{} = d) do
    struct(ProductoEsquema, Map.from_struct(d))
  end
end
