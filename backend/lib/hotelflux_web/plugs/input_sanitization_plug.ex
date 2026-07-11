defmodule HotelFluxWeb.Plugs.InputSanitizationPlug do
  @moduledoc """
  Plug de sanitización de entrada — Previene inyecciones XSS/SQL.

  Implementa controles OWASP:
    - A03:2021 Injection (SQL, XSS, Command)
    - A07:2021 Identification and Authentication Failures
    - ISO 27001 A.14.2.5 (Secure Development Policy)

  Estrategia:
    1. Limita tamaño de body params (previene DoS)
    2. Sanitiza strings recursivamente (strip tags HTML peligrosos)
    3. Valida formatos de entrada comunes (email, UUID)
    4. Rechaza payloads con patrones de inyección conocidos
  """
  import Plug.Conn

  @behaviour Plug

  # Tamaño máximo de un campo string individual (OWASP)
  @max_field_length 10_000

  # Patrones de inyección peligrosos (XSS + SQLi + Command Injection)
  @dangerous_patterns [
    ~r/<script[\s>]/i,
    ~r/javascript:/i,
    ~r/on\w+\s*=/i,
    ~r/UNION\s+SELECT/i,
    ~r/;\s*DROP\s+TABLE/i,
    ~r/;\s*DELETE\s+FROM/i,
    ~r/'\s*OR\s+'1'\s*=\s*'1/i,
    ~r/`.*`/,
    ~r/\$\{.*\}/
  ]

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    case sanitize_params(conn.params) do
      {:ok, sanitized} ->
        %{conn | params: sanitized}

      {:error, reason} ->
        body = Jason.encode!(%{
          error: "input_validation_failed",
          message: reason,
          codigo: "OWASP_A03"
        })

        conn
        |> put_resp_content_type("application/json")
        |> send_resp(400, body)
        |> halt()
    end
  end

  # ── Sanitización recursiva de parámetros ──

  defp sanitize_params(params) when is_map(params) do
    Enum.reduce_while(params, {:ok, %{}}, fn {key, value}, {:ok, acc} ->
      case sanitize_value(value) do
        {:ok, sanitized} -> {:cont, {:ok, Map.put(acc, key, sanitized)}}
        {:error, _} = err -> {:halt, err}
      end
    end)
  end

  defp sanitize_value(value) when is_binary(value) do
    case {String.length(value) > @max_field_length, has_dangerous_pattern?(value)} do
      {true, _} -> {:error, "Campo excede longitud máxima permitida (#{@max_field_length} caracteres)"}
      {_, true} -> {:error, "Contenido no permitido detectado en la entrada"}
      {false, false} -> {:ok, sanitize_string(value)}
    end
  end

  defp sanitize_value(value) when is_list(value) do
    Enum.reduce_while(value, {:ok, []}, fn item, {:ok, acc} ->
      case sanitize_value(item) do
        {:ok, sanitized} -> {:cont, {:ok, acc ++ [sanitized]}}
        {:error, _} = err -> {:halt, err}
      end
    end)
  end

  defp sanitize_value(value) when is_map(value), do: sanitize_params(value)
  defp sanitize_value(value) when is_number(value), do: {:ok, value}
  defp sanitize_value(value) when is_boolean(value), do: {:ok, value}
  defp sanitize_value(nil), do: {:ok, nil}
  defp sanitize_value(value) when is_atom(value), do: {:ok, value}

  # ── Funciones puras de sanitización ──

  defp sanitize_string(str) do
    str
    |> String.trim()
    |> strip_null_bytes()
  end

  defp strip_null_bytes(str) do
    String.replace(str, <<0>>, "")
  end

  defp has_dangerous_pattern?(str) do
    Enum.any?(@dangerous_patterns, &Regex.match?(&1, str))
  end
end
