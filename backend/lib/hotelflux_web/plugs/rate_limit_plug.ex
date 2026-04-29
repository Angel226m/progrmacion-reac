defmodule HotelFluxWeb.Plugs.RateLimitPlug do
  @moduledoc """
  Plug de Rate Limiting global — Protege contra ataques de fuerza bruta y DoS.

  Implementa controles OWASP:
    - A04:2021 Insecure Design (rate limiting como defensa en profundidad)
    - A07:2021 Identification and Authentication Failures
    - ISO 27001 A.13.1.1 (Network Controls)

  Estrategia: sliding window con Redis sorted sets.
  Límites configurables por tipo de ruta (auth, api, public).
  Responde con 429 + Retry-After header cuando se excede.
  """
  import Plug.Conn
  alias HotelFlux.Adapters.Cache.RedisCache

  require Logger

  @behaviour Plug

  @impl true
  def init(opts) do
    %{
      max_requests: Keyword.get(opts, :max_requests, 60),
      window_seconds: Keyword.get(opts, :window_seconds, 60),
      prefix: Keyword.get(opts, :prefix, "api")
    }
  end

  @impl true
  def call(conn, %{max_requests: max, window_seconds: window, prefix: prefix}) do
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    key = "rate:#{prefix}:#{ip}"

    case RedisCache.verificar_rate_limit(key, max, window) do
      :ok ->
        conn
        |> put_resp_header("x-ratelimit-limit", to_string(max))
        |> put_resp_header("x-ratelimit-remaining", to_string(max - 1))
        |> put_resp_header("x-ratelimit-reset", to_string(window))

      {:error, :rate_limit_excedido} ->
        Logger.warning("[RateLimit] Límite excedido para #{prefix}:#{ip}")

        body = Jason.encode!(%{
          error: "rate_limit_exceeded",
          message: "Demasiadas solicitudes. Intente de nuevo en #{window} segundos.",
          retry_after: window,
          codigo: "OWASP_A04"
        })

        conn
        |> put_resp_content_type("application/json")
        |> put_resp_header("retry-after", to_string(window))
        |> put_resp_header("x-ratelimit-limit", to_string(max))
        |> put_resp_header("x-ratelimit-remaining", "0")
        |> send_resp(429, body)
        |> halt()
    end
  end
end
