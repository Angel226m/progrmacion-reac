defmodule HotelFlux.Repo do
  use Ecto.Repo,
    otp_app: :hotelflux,
    adapter: Ecto.Adapters.Postgres
end
