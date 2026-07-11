defmodule HotelFlux.Adapters.Repos.HuespedRepo do
  @moduledoc "Adaptador — Repositorio de huéspedes."

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Huesped, as: HuespedEsquema
  alias HotelFlux.Domain.Huesped

  def obtener(id) do
    case Repo.get(HuespedEsquema, id) do
      nil -> {:error, :not_found}
      huesped -> {:ok, to_domain(huesped)}
    end
  end

  def crear(attrs) do
    %HuespedEsquema{}
    |> HuespedEsquema.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, huesped} -> {:ok, to_domain(huesped)}
      {:error, _} = err -> err
    end
  end

  def actualizar(id, attrs) do
    with {:ok, huesped} <- obtener(id) do
      huesped
      |> from_domain()
      |> HuespedEsquema.changeset(attrs)
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, to_domain(updated)}
        {:error, _} = err -> err
      end
    end
  end

  def listar do
    HuespedEsquema
    |> where([h], h.eliminado == false)
    |> order_by([h], [h.apellido, h.nombre])
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  def buscar_por_email(email) do
    case Repo.get_by(HuespedEsquema, email: email) do
      nil -> {:error, :not_found}
      huesped -> {:ok, to_domain(huesped)}
    end
  end

  @doc "Buscar huésped por número de documento"
  def buscar_por_documento(documento) do
    case Repo.get_by(HuespedEsquema, documento: documento) do
      nil -> {:error, :not_found}
      huesped -> {:ok, to_domain(huesped)}
    end
  end

  def eliminar(id) do
    case obtener(id) do
      {:ok, huesped} ->
        now = DateTime.utc_now()
        huesped_esquema = from_domain(huesped)
        changeset = Ecto.Changeset.change(huesped_esquema, eliminado: true, eliminado_en: now)
        case Repo.update(changeset) do
          {:ok, _} -> {:ok, %{ok: true}}
          error -> error
        end
      error -> error
    end
  end

  def buscar(termino) do
    patron = "%#{termino}%"
    from(h in HuespedEsquema,
      where: h.eliminado == false,
      where: ilike(h.nombre, ^patron) or ilike(h.apellido, ^patron) or ilike(h.email, ^patron)
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  defp to_domain(%HuespedEsquema{} = s) do
    struct(Huesped, Map.from_struct(s))
  end

  defp from_domain(%Huesped{} = d) do
    struct(HuespedEsquema, Map.from_struct(d))
  end
end
