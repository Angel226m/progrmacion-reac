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

    for repo <- repos() do
      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def rollback(repo, version) do
    load_app()

    {:ok, _, _} =
      Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  def seed do
    load_app()

    for repo <- repos() do
      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, fn _repo ->
          seed_file = Path.join([:code.priv_dir(@app), "repo", "seeds.exs"])

          if File.exists?(seed_file) do
            try do
              Code.eval_file(seed_file)
            rescue
              e ->
                IO.puts("Warning: seeds failed — #{inspect(e)}")
            end
          end
        end)
    end
  end

  def seed_extra do
    load_app()

    for repo <- repos() do
      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, fn _repo ->
          seed_file = Path.join([:code.priv_dir(@app), "repo", "seeds_extra.exs"])

          if File.exists?(seed_file) do
            try do
              Code.eval_file(seed_file)
            rescue
              e ->
                IO.puts("Error en seeds_extra — #{inspect(e)}")
            end
          else
            IO.puts("seeds_extra.exs no encontrado en #{seed_file}")
          end
        end)
    end
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end
