defmodule HotelFluxWeb.Plugs.SocketOriginValidator do
  @moduledoc """
  Validador personalizado de origen para WebSocket — maneja variantes de host.
  
  Soluciona problema: Phoenix rechaza origen aunque esté en check_origin
  porque nginx proxifica bajo HTTPS pero el backend recibe X-Forwarded-Proto.
  
  Estrategia:
  1. Normalizar origen (sin protocolo cuando es necesario)
  2. Validar contra lista dinámica de runtime.exs
  3. Registrar intentos fallidos
  """
  
  require Logger

  def check_origin(origin_header, _endpoint_config, _opts) do
    valid_origins = Application.get_env(:hotelflux, :websocket_check_origins, [])
    
    # Normalizar el origen recibido (remover protocolo para comparación flexible)
    normalized_origin = normalize_origin(origin_header)
    
    # Intentar match exacto o sin protocolo
    is_valid = 
      Enum.any?(valid_origins, fn allowed ->
        allowed_normalized = normalize_origin(allowed)
        
        origin_header == allowed || 
          normalized_origin == allowed_normalized ||
          # Comparación flexible: host:puerto
          extract_host(origin_header) == extract_host(allowed)
      end)
    
    log_if_invalid(is_valid, origin_header, normalized_origin, valid_origins)
    is_valid
  end
  
  # Normaliza el origen removiendo protocolo para comparación flexible
  defp normalize_origin(origin) when is_binary(origin) do
    origin
    |> String.replace(~r/^https?:\/\//, "")  # Remover https:// o http://
    |> String.replace(~r/^\/\//, "")          # Remover //
  end
  
  defp normalize_origin(nil), do: ""
  
  # Extrae host:puerto (ignora protocolo)
  defp extract_host(origin) when is_binary(origin) do
    origin
    |> String.replace(~r/^https?:\/\//, "")
    |> String.replace(~r/^\/\//, "")
  end
  
  defp extract_host(nil), do: ""

  defp log_if_invalid(false, origin_header, normalized_origin, valid_origins) do
    Logger.warning("""
    [WebSocket Origin Rejection]
    Received Origin: #{origin_header}
    Normalized: #{normalized_origin}
    Valid Origins: #{inspect(valid_origins)}
    """)
  end

  defp log_if_invalid(_, _, _, _), do: :ok
end
