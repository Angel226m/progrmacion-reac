defmodule HotelFlux.Adapters.Repos.UsuarioRepo do
  @moduledoc """
  Adaptador — Repositorio de usuarios/empleados.
  Incluye gestión con soft delete y consultas para gestión de personal.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Usuario

  @doc "Obtener usuario por ID (excluye eliminados)"
  def obtener(id) do
    case Repo.get(Usuario, id) do
      nil -> {:error, :not_found}
      %{eliminado: true} -> {:error, :not_found}
      usuario -> {:ok, Repo.preload(usuario, :turno)}
    end
  end

  @doc "Listar todos los usuarios activos (excluye eliminados)"
  def listar(filtros \\ %{}) do
    Usuario
    |> where([u], u.eliminado == false)
    |> aplicar_filtros(filtros)
    |> order_by([u], [u.rol, u.nombre])
    |> Repo.all()
    |> then(&Repo.preload(&1, :turno))
  end

  @doc "Crear un nuevo usuario"
  def crear(attrs) do
    %Usuario{}
    |> Usuario.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, usuario} -> {:ok, Repo.preload(usuario, :turno)}
      {:error, changeset} -> {:error, changeset}
    end
  end

  @doc "Actualizar datos de un usuario (sin cambiar contraseña)"
  def actualizar(id, attrs) do
    with {:ok, usuario} <- obtener(id) do
      usuario
      |> Usuario.update_changeset(attrs)
      |> Repo.update()
      |> case do
        {:ok, usuario_act} -> {:ok, Repo.preload(usuario_act, :turno)}
        {:error, changeset} -> {:error, changeset}
      end
    end
  end

  @doc "Eliminar usuario (soft delete)"
  def eliminar(id) do
    with {:ok, usuario} <- obtener(id) do
      usuario
      |> Usuario.soft_delete_changeset()
      |> Repo.update()
    end
  end

  @doc "Listar personal por rol"
  def por_rol(rol) do
    from(u in Usuario,
      where: u.rol == ^rol and u.activo == true and u.eliminado == false,
      order_by: [asc: u.nombre]
    )
    |> Repo.all()
  end

  @doc "Buscar usuarios por nombre o email"
  def buscar(termino) do
    patron = "%#{termino}%"
    from(u in Usuario,
      where: u.eliminado == false,
      where: ilike(u.nombre, ^patron) or ilike(u.email, ^patron),
      order_by: [asc: u.nombre]
    )
    |> Repo.all()
  end

  @doc "Contar personal por rol"
  def contar_por_rol do
    from(u in Usuario,
      where: u.activo == true and u.eliminado == false,
      group_by: u.rol,
      select: {u.rol, count(u.id)}
    )
    |> Repo.all()
    |> Map.new()
  end

  defp aplicar_filtros(query, filtros) do
    Enum.reduce(filtros, query, fn
      {"rol", rol}, q -> where(q, [u], u.rol == ^rol)
      {"activo", activo}, q -> where(q, [u], u.activo == ^activo)
      _, q -> q
    end)
  end
end
