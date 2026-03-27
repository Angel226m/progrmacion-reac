defmodule HotelFlux.Adapters.Repos.HuespedRepo do
  @moduledoc "Adaptador — Repositorio de huéspedes."

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Huesped

  def obtener(id) do
    case Repo.get(Huesped, id) do
      nil -> {:error, :not_found}
      huesped -> {:ok, huesped}
    end
  end

  def crear(attrs) do
    %Huesped{}
    |> Huesped.changeset(attrs)
    |> Repo.insert()
  end

  def actualizar(id, attrs) do
    with {:ok, huesped} <- obtener(id) do
      huesped
      |> Huesped.changeset(attrs)
      |> Repo.update()
    end
  end

  def listar do
    Huesped
    |> where([h], h.eliminado == false)
    |> order_by([h], [h.apellido, h.nombre])
    |> Repo.all()
  end

  def buscar_por_email(email) do
    case Repo.get_by(Huesped, email: email) do
      nil -> {:error, :not_found}
      huesped -> {:ok, huesped}
    end
  end

  @doc "Buscar huésped por número de documento"
  def buscar_por_documento(documento) do
    case Repo.get_by(Huesped, documento_numero: documento) do
      nil -> {:error, :not_found}
      huesped -> {:ok, huesped}
    end
  end

  def buscar(termino) do
    patron = "%#{termino}%"
    from(h in Huesped,
      where: h.eliminado == false,
      where: ilike(h.nombre, ^patron) or ilike(h.apellido, ^patron) or ilike(h.email, ^patron)
    )
    |> Repo.all()
  end
end
