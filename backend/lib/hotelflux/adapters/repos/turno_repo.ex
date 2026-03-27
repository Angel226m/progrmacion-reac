defmodule HotelFlux.Adapters.Repos.TurnoRepo do
  @moduledoc """
  Adaptador — Repositorio de turnos de trabajo.
  Gestiona los turnos predefinidos: Mañana, Tarde, Noche.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Turno

  @doc "Obtener turno por ID"
  def obtener(id) do
    case Repo.get(Turno, id) do
      nil -> {:error, :not_found}
      turno -> {:ok, turno}
    end
  end

  @doc "Listar todos los turnos activos"
  def listar do
    from(t in Turno,
      where: t.eliminado == false and t.activo == true,
      order_by: [asc: t.hora_inicio]
    )
    |> Repo.all()
  end

  @doc "Crear un nuevo turno"
  def crear(attrs) do
    %Turno{}
    |> Turno.changeset(attrs)
    |> Repo.insert()
  end

  @doc "Obtener turno por nombre"
  def obtener_por_nombre(nombre) do
    Repo.get_by(Turno, nombre: nombre, eliminado: false)
  end
end
