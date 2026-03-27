defmodule HotelFluxWeb.HealthController do
  use Phoenix.Controller

  def check(conn, _params) do
    conn |> json(%{status: "ok", app: "HotelFlux", version: "1.0.0"})
  end
end
