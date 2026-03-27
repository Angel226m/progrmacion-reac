defmodule HotelFlux.Adapters.Repos.PisoRepo do
  @moduledoc """
  Adaptador — Repositorio de pisos del hotel.
  Permite CRUD completo con soft delete.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Piso

  @doc "Obtener un piso por ID (excluye eliminados)"
  def obtener(id) do
    case Repo.get(Piso, id) do
      nil -> {:error, :not_found}
      %{eliminado: true} -> {:error, :not_found}
      piso -> {:ok, piso}
    end
  end

  @doc "Listar todos los pisos activos"
  def listar do
    from(p in Piso,
      where: p.eliminado == false,
      order_by: [asc: p.numero]
    )
    |> Repo.all()
  end

  @doc "Crear un nuevo piso"
  def crear(attrs) do
    %Piso{}
    |> Piso.changeset(attrs)
    |> Repo.insert()
  end

  @doc "Actualizar datos de un piso"
  def actualizar(id, attrs) do
    with {:ok, piso} <- obtener(id) do
      piso
      |> Piso.changeset(attrs)
      |> Repo.update()
    end
  end

  @doc "Eliminar un piso (soft delete)"
  def eliminar(id) do
    with {:ok, piso} <- obtener(id) do
      piso
      |> Piso.soft_delete_changeset()
      |> Repo.update()
    end
  end
end
