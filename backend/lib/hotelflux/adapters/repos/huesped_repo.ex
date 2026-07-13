defmodule HotelFlux.Adapters.Repos.HuespedRepo do
  @moduledoc """
  Adaptador — Repositorio de huéspedes.
  Implementa operaciones CRUD para la entidad Huésped
  con conversión entre esquema de persistencia y struct de dominio.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Huesped, as: HuespedEsquema
  alias HotelFlux.Domain.Huesped

  # Obtiene un huésped por su ID, retorna error si no existe
  def obtener(id) do
    case Repo.get(HuespedEsquema, id) do
      nil -> {:error, :not_found}
      huesped -> {:ok, to_domain(huesped)}
    end
  end

  # Crea un nuevo huésped con los atributos proporcionados
  def crear(attrs) do
    %HuespedEsquema{}
    |> HuespedEsquema.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, huesped} -> {:ok, to_domain(huesped)}
      {:error, _} = err -> err
    end
  end

  # Actualiza los atributos de un huésped existente
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

  # Lista todos los huéspedes activos ordenados por apellido y nombre
  def listar do
    HuespedEsquema
    |> where([h], h.eliminado == false)
    |> order_by([h], [h.apellido, h.nombre])
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  # Busca un huésped por su dirección de email
  def buscar_por_email(email) do
    case Repo.get_by(HuespedEsquema, email: email) do
      nil -> {:error, :not_found}
      huesped -> {:ok, to_domain(huesped)}
    end
  end

  @doc "Buscar huésped por número de documento"
  # Busca un huésped por su número de documento de identidad
  def buscar_por_documento(documento) do
    case Repo.get_by(HuespedEsquema, documento: documento) do
      nil -> {:error, :not_found}
      huesped -> {:ok, to_domain(huesped)}
    end
  end

  # Eliminación soft: marca el huésped como eliminado con timestamp
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

  # Búsqueda textual por nombre, apellido o email usando ILIKE
  def buscar(termino) do
    patron = "%#{termino}%"
    from(h in HuespedEsquema,
      where: h.eliminado == false,
      where: ilike(h.nombre, ^patron) or ilike(h.apellido, ^patron) or ilike(h.email, ^patron)
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  # Convierte esquema de persistencia a struct de dominio
  defp to_domain(%HuespedEsquema{} = s) do
    struct(Huesped, Map.from_struct(s))
  end

  # Convierte struct de dominio a esquema de persistencia
  defp from_domain(%Huesped{} = d) do
    struct(HuespedEsquema, Map.from_struct(d))
  end
end
