defmodule HotelFlux.DataCase do
  @moduledoc "Case template para tests que necesitan repositorio."
  use ExUnit.CaseTemplate

  using do
    quote do
      alias HotelFlux.Repo
      import Ecto
      import Ecto.Changeset
      import Ecto.Query
      import HotelFlux.DataCase
    end
  end

  setup tags do
    HotelFlux.DataCase.setup_sandbox(tags)
    :ok
  end

  def setup_sandbox(tags) do
    pid = Ecto.Adapters.SQL.Sandbox.start_owner!(HotelFlux.Repo, shared: not tags[:async])
    on_exit(fn -> Ecto.Adapters.SQL.Sandbox.stop_owner(pid) end)
  end
end
