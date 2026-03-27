defmodule HotelFlux.ChannelCase do
  @moduledoc "Case template para tests de canales WebSocket."
  use ExUnit.CaseTemplate

  using do
    quote do
      import Phoenix.ChannelTest
      import HotelFlux.ChannelCase

      @endpoint HotelFluxWeb.Endpoint
    end
  end

  setup tags do
    HotelFlux.DataCase.setup_sandbox(tags)
    :ok
  end
end
