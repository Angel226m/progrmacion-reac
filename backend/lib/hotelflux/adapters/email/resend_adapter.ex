defmodule HotelFlux.Adapters.Email.ResendAdapter do
  @moduledoc """
  Adaptador de transporte real para Resend API vía Finch HTTP.
  Llama directamente a la API REST de Resend (https://api.resend.com/emails).
  """

  require Logger

  @base_url "https://api.resend.com"
  @finch_name HotelFlux.Finch

  @spec enviar(map()) :: {:ok, map()} | {:error, term()}
  def enviar(params) do
    api_key = api_key!()
    body = Jason.encode!(construir_payload(params))
    headers = [
      {"Authorization", "Bearer #{api_key}"},
      {"Content-Type", "application/json"}
    ]

    @base_url
    |> Finch.build(:post, "/emails", headers, body)
    |> Finch.request(@finch_name)
    |> parse_respuesta()
  end

  defp parse_respuesta({:ok, %Finch.Response{status: 200, body: body}}) do
    case Jason.decode(body) do
      {:ok, decoded} -> {:ok, Map.put(decoded, "provider", "resend")}
      _ -> {:ok, %{provider: "resend"}}
    end
  end

  defp parse_respuesta({:ok, %Finch.Response{status: status, body: body}}) do
    reason = "#{status}: #{String.slice(body || "", 0, 200)}"
    Logger.error("[ResendAdapter] ✗ HTTP #{reason}")
    {:error, reason}
  end

  defp parse_respuesta({:error, reason}) do
    Logger.error("[ResendAdapter] ✗ #{inspect(reason)}")
    {:error, reason}
  end

  defp construir_payload(%{from: from, to: to, subject: subject, html: html} = params) do
    %{from: from, to: to, subject: subject, html: html}
    |> agregar_texto(params)
    |> agregar_reply_to(params)
  end

  defp agregar_texto(payload, %{text: text}) when is_binary(text) and text != "",
    do: Map.put(payload, :text, text)
  defp agregar_texto(payload, _params), do: payload

  defp agregar_reply_to(payload, %{reply_to: rt}) when is_binary(rt) and rt != "",
    do: Map.put(payload, :reply_to, rt)
  defp agregar_reply_to(payload, _params), do: payload

  defp api_key! do
    Application.get_env(:hotelflux, :resend_api_key) ||
      System.get_env("RESEND_API_KEY") ||
      raise "RESEND_API_KEY no configurada"
  end
end
