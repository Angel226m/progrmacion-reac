defmodule HotelFlux.Adapters.Repos.PisoRepo do
  @moduledoc """
  Adaptador — Repositorio de pisos del hotel.
  Permite CRUD completo con soft delete.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Piso, as: PisoEsquema
  alias HotelFlux.Domain.Piso

  @doc "Obtener un piso por ID (excluye eliminados)"
  def obtener(id) do
    case Repo.get(PisoEsquema, id) do
      nil -> {:error, :not_found}
      %{eliminado: true} -> {:error, :not_found}
      piso -> {:ok, to_domain(piso)}
    end
  end

  @doc "Listar todos los pisos activos"
  def listar do
    from(p in PisoEsquema,
      where: p.eliminado == false,
      order_by: [asc: p.numero]
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc "Crear un nuevo piso"
  def crear(attrs) do
    %PisoEsquema{}
    |> PisoEsquema.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, piso} -> {:ok, to_domain(piso)}
      {:error, _} = err -> err
    end
  end

  @doc "Actualizar datos de un piso"
  def actualizar(id, attrs) do
    with {:ok, piso} <- obtener(id) do
      piso
      |> from_domain()
      |> PisoEsquema.changeset(attrs)
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, to_domain(updated)}
        {:error, _} = err -> err
      end
    end
  end

  @doc "Eliminar un piso (soft delete)"
  def eliminar(id) do
    with {:ok, piso} <- obtener(id) do
      piso
      |> from_domain()
      |> PisoEsquema.soft_delete_changeset()
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, to_domain(updated)}
        {:error, _} = err -> err
      end
    end
  end

  defp to_domain(%PisoEsquema{} = s) do
    struct(Piso, Map.from_struct(s))
  end

  defp from_domain(%Piso{} = d) do
    struct(PisoEsquema, Map.from_struct(d))
  end
end
