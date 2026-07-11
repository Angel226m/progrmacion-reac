defmodule HotelFlux.Adapters.Repos.UsuarioRepo do
  @moduledoc """
  Adaptador — Repositorio de usuarios/empleados.
  Incluye gestión con soft delete y consultas para gestión de personal.
  """

  import Ecto.Query
  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Usuario, as: UsuarioEsquema
  alias HotelFlux.Domain.Usuario

  @doc "Obtener usuario por ID (excluye eliminados)"
  def obtener(id) do
    case Repo.get(UsuarioEsquema, id) do
      nil -> {:error, :not_found}
      %{eliminado: true} -> {:error, :not_found}
      usuario ->
        usuario = Repo.preload(usuario, :turno)
        {:ok, to_domain(usuario)}
    end
  end

  @doc "Listar todos los usuarios activos (excluye eliminados)"
  def listar(filtros \\ %{}) do
    UsuarioEsquema
    |> where([u], u.eliminado == false)
    |> aplicar_filtros(filtros)
    |> order_by([u], [u.rol, u.nombre])
    |> Repo.all()
    |> then(fn usuarios -> Repo.preload(usuarios, :turno) end)
    |> Enum.map(&to_domain/1)
  end

  @doc "Crear un nuevo usuario"
  def crear(attrs) do
    %UsuarioEsquema{}
    |> UsuarioEsquema.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, usuario} -> {:ok, to_domain(Repo.preload(usuario, :turno))}
      {:error, changeset} -> {:error, changeset}
    end
  end

  @doc "Actualizar datos de un usuario (sin cambiar contraseña)"
  def actualizar(id, attrs) do
    with {:ok, usuario} <- obtener(id) do
      usuario
      |> from_domain()
      |> UsuarioEsquema.update_changeset(attrs)
      |> Repo.update()
      |> case do
        {:ok, usuario_act} -> {:ok, to_domain(Repo.preload(usuario_act, :turno))}
        {:error, changeset} -> {:error, changeset}
      end
    end
  end

  @doc "Eliminar usuario (soft delete)"
  def eliminar(id) do
    with {:ok, usuario} <- obtener(id) do
      usuario
      |> from_domain()
      |> UsuarioEsquema.soft_delete_changeset()
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, to_domain(updated)}
        {:error, _} = err -> err
      end
    end
  end

  @doc "Listar personal por rol"
  def por_rol(rol) do
    from(u in UsuarioEsquema,
      where: u.rol == ^rol and u.activo == true and u.eliminado == false,
      order_by: [asc: u.nombre]
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc "Buscar usuarios por nombre o email"
  def buscar(termino) do
    patron = "%#{termino}%"
    from(u in UsuarioEsquema,
      where: u.eliminado == false,
      where: ilike(u.nombre, ^patron) or ilike(u.email, ^patron),
      order_by: [asc: u.nombre]
    )
    |> Repo.all()
    |> Enum.map(&to_domain/1)
  end

  @doc "Contar personal por rol"
  def contar_por_rol do
    from(u in UsuarioEsquema,
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

  defp to_domain(%UsuarioEsquema{} = s) do
    struct(Usuario, Map.from_struct(s))
  end

  defp from_domain(%Usuario{} = d) do
    struct(UsuarioEsquema, Map.from_struct(d))
  end
end
