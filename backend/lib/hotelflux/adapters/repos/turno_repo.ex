defmodule HotelFlux.Adapters.Repos.TurnoRepo do
  @moduledoc """
  Adaptador — Repositorio de turnos de trabajo.
  Gestiona los turnos predefinidos: Mañana, Tarde, Noche.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Turno, as: TurnoEsquema
  alias HotelFlux.Domain.Turno

  @doc "Obtener turno por ID"
  def obtener(id) do
    case Repo.get(TurnoEsquema, id) do
      nil -> {:error, :not_found}
      turno -> {:ok, to_domain(turno)}
    end
  end

  @doc "Listar todos los turnos activos"
  def listar do
    from(t in TurnoEsquema,
      where: t.eliminado == false and t.activo == true,
      order_by: [asc: t.hora_inicio]
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc "Crear un nuevo turno"
  def crear(attrs) do
    %TurnoEsquema{}
    |> TurnoEsquema.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, turno} -> {:ok, to_domain(turno)}
      {:error, _} = err -> err
    end
  end

  @doc "Obtener turno por nombre"
  def obtener_por_nombre(nombre) do
    case Repo.get_by(TurnoEsquema, nombre: nombre, eliminado: false) do
      nil -> nil
      turno -> to_domain(turno)
    end
  end

  defp to_domain(%TurnoEsquema{} = s) do
    struct(Turno, Map.from_struct(s))
  end
end
