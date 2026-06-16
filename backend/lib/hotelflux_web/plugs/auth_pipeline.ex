defmodule HotelFluxWeb.Plugs.AuthPipeline do
  @moduledoc """
  Pipeline Guardian para validar JWT en cada request protegido.

  Orden:
    1. CookieToHeaderPlug — copia el token de la cookie httpOnly al
       header `Authorization` si no hay un Bearer explícito.
       Permite sesiones que persisten via cookie tras refresh.
    2. VerifyHeader — extrae y verifica el JWT del header.
    3. EnsureAuthenticated — rechaza si el JWT es inválido/ausente.
    4. LoadResource — carga el recurso (usuario) desde los claims.
  """
  use Guardian.Plug.Pipeline,
    otp_app: :hotelflux,
    error_handler: HotelFluxWeb.Plugs.AuthErrorHandler,
    module: HotelFlux.Guardian

  plug HotelFluxWeb.Plugs.CookieToHeaderPlug
  plug Guardian.Plug.VerifyHeader, claims: %{"typ" => "access"}
  plug Guardian.Plug.EnsureAuthenticated
  plug Guardian.Plug.LoadResource, allow_blank: false
end
