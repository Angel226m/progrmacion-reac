defmodule HotelFlux.Adapters.Email.ResendAdapter do
  @moduledoc """
  Adaptador de transporte real para Resend API vía Finch HTTP.
  Llama directamente a la API REST de Resend (https://api.resend.com/emails).
  """

  require Logger

  # URL base de la API de Resend
  @base_url "https://api.resend.com"
  # Nombre del pool de Finch para las peticiones HTTP
  @finch_name HotelFlux.Finch

  @spec enviar(map()) :: {:ok, map()} | {:error, term()}
  # Función pública que envía un email a través de la API de Resend
  def enviar(params) do
    # Obtiene la API key desde configuración o variables de entorno
    api_key = api_key!()
    # Construye y codifica el payload en JSON
    body = Jason.encode!(construir_payload(params))
    headers = [
      {"Authorization", "Bearer #{api_key}"},
      {"Content-Type", "application/json"}
    ]

    Finch.build(:post, "#{@base_url}/emails", headers, body)
    |> Finch.request(@finch_name)
    |> parse_respuesta()
  end

  # Maneja respuestas exitosas (HTTP 200) decodificando el body JSON
  defp parse_respuesta({:ok, %Finch.Response{status: 200, body: body}}) do
    case Jason.decode(body) do
      {:ok, decoded} -> {:ok, Map.put(decoded, "provider", "resend")}
      _ -> {:ok, %{provider: "resend"}}
    end
  end

  # Maneja respuestas HTTP con errores (status distinto de 200)
  defp parse_respuesta({:ok, %Finch.Response{status: status, body: body}}) do
    reason = "#{status}: #{String.slice(body || "", 0, 200)}"
    Logger.error("[ResendAdapter] ✗ HTTP #{reason}")
    {:error, reason}
  end

  # Maneja errores de conexión o timeouts en la petición HTTP
  defp parse_respuesta({:error, reason}) do
    Logger.error("[ResendAdapter] ✗ #{inspect(reason)}")
    {:error, reason}
  end

  # Construye el payload mínimo del email con campos obligatorios
  defp construir_payload(%{from: from, to: to, subject: subject, html: html} = params) do
    %{from: from, to: to, subject: subject, html: html}
    |> agregar_texto(params)
    |> agregar_reply_to(params)
  end

  # Agrega campo :text al payload si está presente y no vacío
  defp agregar_texto(payload, %{text: text}) when is_binary(text) and text != "",
    do: Map.put(payload, :text, text)
  defp agregar_texto(payload, _params), do: payload

  # Agrega campo :reply_to al payload si está presente y no vacío
  defp agregar_reply_to(payload, %{reply_to: rt}) when is_binary(rt) and rt != "",
    do: Map.put(payload, :reply_to, rt)
  defp agregar_reply_to(payload, _params), do: payload

  # Obtiene la API key desde configuración de la aplicación o variable de entorno
  defp api_key! do
    Application.get_env(:hotelflux, :resend_api_key) ||
      System.get_env("RESEND_API_KEY") ||
      raise "RESEND_API_KEY no configurada"
  end
end
