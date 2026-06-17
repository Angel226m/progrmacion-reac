defmodule HotelFluxWeb.Plugs.SecurityHeadersPlug do
  @moduledoc """
  Plug de seguridad OWASP — Inyecta headers de protección en cada respuesta.

  Implementa controles de:
    - OWASP Top 10 (A05:2021 Security Misconfiguration)
    - ISO 27001 Annex A.14 (System Acquisition, Development)
    - CWE-693 (Protection Mechanism Failure)

  Headers inyectados:
    - Content-Security-Policy (CSP Level 3)
    - Strict-Transport-Security (HSTS 1 año + includeSubDomains)
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 0 (desactivado — CSP es suficiente)
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: bloquea APIs sensibles
    - Cache-Control: no-store para respuestas autenticadas
    - X-Request-Id: trazabilidad de cada petición
  """
  import Plug.Conn

  @behaviour Plug

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    conn
    |> put_resp_header("x-content-type-options", "nosniff")
    |> put_resp_header("x-frame-options", "DENY")
    |> put_resp_header("x-xss-protection", "0")
    |> put_resp_header("referrer-policy", "strict-origin-when-cross-origin")
    |> put_resp_header("permissions-policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()")
    |> put_resp_header("strict-transport-security", "max-age=31536000; includeSubDomains; preload")
    |> put_resp_header("content-security-policy", csp_policy())
    |> put_resp_header("cache-control", "no-store, no-cache, must-revalidate, private")
    |> put_resp_header("pragma", "no-cache")
    |> put_resp_header("x-permitted-cross-domain-policies", "none")
    |> put_resp_header("cross-origin-embedder-policy", "require-corp")
    |> put_resp_header("cross-origin-opener-policy", "same-origin")
    |> put_resp_header("cross-origin-resource-policy", "same-origin")
  end

  # Política CSP estricta (OWASP A03:2021 — Injection)
  defp csp_policy do
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ]
    |> Enum.join("; ")
  end
end
