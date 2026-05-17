defmodule HotelFluxWeb.Plugs.AuthPipeline do
  @moduledoc """
  Pipeline Guardian para validar JWT en cada request protegido.
  """
  use Guardian.Plug.Pipeline,
    otp_app: :hotelflux,
    error_handler: HotelFluxWeb.Plugs.AuthErrorHandler,
    module: HotelFlux.Guardian

  plug Guardian.Plug.VerifyHeader, claims: %{"typ" => "access"}
  plug Guardian.Plug.EnsureAuthenticated
  plug Guardian.Plug.LoadResource, allow_blank: false
end
