defmodule HotelFlux.Adapters.Email.ResendAdapter do
  @moduledoc """
  Adaptador de transporte real para Resend API.
  Sin efectos de control (if/case/switch) — solo pattern matching en cláusulas de función.
  """

  require Logger

  @spec enviar(map()) :: {:ok, map()} | {:error, term()}
  def enviar(params) do
    client = build_client()
    email_params = construir_params(params)

    client
    |> Resend.Emails.send(email_params)
    |> parse_respuesta()
  end

  defp parse_respuesta({:ok, %{} = response}), do: {:ok, Map.put(response, :provider, :resend)}
  defp parse_respuesta({:ok, id}) when is_binary(id), do: {:ok, %{id: id, provider: :resend}}
  defp parse_respuesta({:error, reason}) do
    Logger.error("[ResendAdapter] ✗ #{inspect(reason)}")
    {:error, reason}
  end
  defp parse_respuesta(_), do: {:error, :respuesta_inesperada}

  defp construir_params(%{from: from, to: to, subject: subject, html: html} = params) do
    %{from: from, to: to, subject: subject, html: html}
    |> agregar_texto(params)
    |> agregar_reply_to(params)
  end

  defp agregar_texto(params, %{text: text}) when is_binary(text) and text != "",
    do: Map.put(params, :text, text)
  defp agregar_texto(params, _params), do: params

  defp agregar_reply_to(params, %{reply_to: rt}) when is_binary(rt) and rt != "",
    do: Map.put(params, :reply_to, rt)
  defp agregar_reply_to(params, _params), do: params

  @spec crear_dominio(String.t()) :: {:ok, map()} | {:error, term()}
  def crear_dominio(nombre_dominio) do
    client = build_client()
    Resend.Domains.create(client, %{name: nombre_dominio})
  end

  defp build_client do
    api_key = Application.get_env(:hotelflux, :resend_api_key) ||
                System.get_env("RESEND_API_KEY") ||
                "re_test"

    Resend.client(api_key: api_key)
  end
end
