defmodule HotelFlux.MixProject do
  use Mix.Project

  def project do
    [
      app: :hotelflux,
      version: "1.0.0",
      elixir: "~> 1.17",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  def application do
    [
      mod: {HotelFlux.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      # Phoenix Framework
      {:phoenix, "~> 1.7.18"},
      {:phoenix_ecto, "~> 4.6"},
      {:ecto_sql, "~> 3.12"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix_html, "~> 4.2"},
      {:phoenix_live_reload, "~> 1.5", only: :dev},
      {:phoenix_live_view, "~> 1.0"},
      {:phoenix_live_dashboard, "~> 0.8"},

      # JSON
      {:jason, "~> 1.4"},

      # HTTP Server
      {:bandit, "~> 1.6"},

      # Authentication
      {:guardian, "~> 2.3"},
      {:bcrypt_elixir, "~> 3.2"},

      # Background Jobs
      {:oban, "~> 2.18"},

      # Redis
      {:redix, "~> 1.5"},

      # CORS
      {:cors_plug, "~> 3.0"},

      # Email — Resend API
      {:resend, "~> 0.4"},

      # UUID
      {:elixir_uuid, "~> 1.2"},

      # Dev/Test
      {:floki, ">= 0.0.0", only: :test},
      {:esbuild, "~> 0.8", runtime: Mix.env() == :dev},
      {:tailwind, "~> 0.2", runtime: Mix.env() == :dev},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.0"},
      {:gettext, "~> 0.26"},
      {:plug_cowboy, "~> 2.7"}
    ]
  end

  defp aliases do
    [
      setup: ["deps.get", "ecto.setup"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"]
    ]
  end
end
