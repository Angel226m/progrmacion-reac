defmodule HotelFlux.Release do
  @moduledoc """
  Tareas de release para ejecutar migraciones en producción (Docker).

  Uso:
    ./bin/hotelflux eval 'HotelFlux.Release.migrate()'
    ./bin/hotelflux eval 'HotelFlux.Release.seed()'
  """

  @app :hotelflux

  def migrate do
    load_app()

    repos()
    |> Enum.each(fn repo ->
      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end)
  end

  def rollback(repo, version) do
    load_app()

    {:ok, _, _} =
      Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  defp candidate_paths(filename) do
    [
      Path.join([:code.priv_dir(@app), "repo", filename]),
      Path.join([Application.app_dir(@app), "priv", "repo", filename]),
      Path.join(["/app", "priv", "repo", filename]),
      Path.join([System.get_env("RELEASE_ROOT", "/app"), "lib", "hotelflux-*", "priv", "repo", filename]),
      Path.join([File.cwd!(), "priv", "repo", filename])
    ]
  end

  defp resolve_seed_path(filename) do
    candidate_paths(filename)
    |> Enum.filter(&File.exists?/1)
    |> List.first()
    |> normalize_path()
  end

  defp normalize_path(nil), do: :not_found

  defp normalize_path(path) do
    path
    |> Path.wildcard()
    |> final_path(path)
  end

  defp final_path([], original), do: original

  defp final_path([head | _], _original), do: head

  def seed do
    load_app()
    IO.puts(">>> Buscando archivo seeds.exs...")

    resolve_seed_path("seeds.exs")
    |> run_seed()
  end

  defp run_seed(:not_found) do
    IO.puts("ERROR: seeds.exs no encontrado en ninguna ruta conocida.")
    IO.puts("       RUTAS REVISADAS:")

    candidate_paths("seeds.exs")
    |> Enum.each(&IO.puts("         - #{&1}  (existe? #{File.exists?(&1)})"))

    raise "No se pudo encontrar seeds.exs"
  end

  defp run_seed(path) when is_binary(path) do
    IO.puts(">>> seeds.exs encontrado en: #{path}")

    repos()
    |> Enum.each(fn repo ->
      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, fn _repo ->
          Code.eval_file(path)
        end)
    end)

    IO.puts(">>> Seeds completados exitosamente.")
  end

  def seed_extra do
    load_app()
    IO.puts(">>> Buscando seeds_extra.exs...")

    resolve_seed_path("seeds_extra.exs")
    |> run_seed_extra()
  end

  defp run_seed_extra(:not_found) do
    IO.puts("seeds_extra.exs no encontrado — se omite.")
    IO.puts("       RUTAS REVISADAS:")

    candidate_paths("seeds_extra.exs")
    |> Enum.each(&IO.puts("         - #{&1}  (existe? #{File.exists?(&1)})"))

    IO.puts("       No es crítico — continuando.")
    :ok
  end

  defp run_seed_extra(path) when is_binary(path) do
    IO.puts(">>> seeds_extra.exs encontrado en: #{path}")

    repos()
    |> Enum.each(fn repo ->
      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, fn _repo ->
          Code.eval_file(path)
        end)
    end)

    IO.puts(">>> seeds_extra completados.")
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end
