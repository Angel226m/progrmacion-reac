defmodule HotelFlux.Adapters.Cache.RedisCache do
  @moduledoc """
  Adaptador — Servicio de caché con Redis.
  Maneja sesiones, caché de consultas frecuentes y bloqueos distribuidos.
  Implementa TTL configurable y serialización JSON.
  """

  require Logger

  # ═══════════════════════════════════════════════════════════
  # OPERACIONES BÁSICAS DE CACHÉ
  # ═══════════════════════════════════════════════════════════

  @doc "Guardar valor en caché con TTL en segundos"
  def set(clave, valor, ttl_segundos \\ 3600) do
    valor_json = Jason.encode!(valor)
    case Redix.command(:redix, ["SET", prefijo(clave), valor_json, "EX", to_string(ttl_segundos)]) do
      {:ok, "OK"} -> :ok
      {:error, reason} ->
        Logger.warning("[RedisCache] Error al guardar #{clave}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  @doc "Obtener valor de caché"
  def get(clave) do
    case Redix.command(:redix, ["GET", prefijo(clave)]) do
      {:ok, nil} -> {:error, :not_found}
      {:ok, valor_json} ->
        case Jason.decode(valor_json) do
          {:ok, valor} -> {:ok, valor}
          {:error, _} -> {:error, :decode_error}
        end
      {:error, reason} ->
        Logger.warning("[RedisCache] Error al leer #{clave}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  @doc "Eliminar valor de caché"
  def delete(clave) do
    case Redix.command(:redix, ["DEL", prefijo(clave)]) do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  @doc "Verificar si existe una clave"
  def exists?(clave) do
    case Redix.command(:redix, ["EXISTS", prefijo(clave)]) do
      {:ok, 1} -> true
      _ -> false
    end
  end

  @doc "Obtener TTL restante en segundos de una clave (-1 sin expiración, -2 no existe)"
  def ttl(clave) do
    case Redix.command(:redix, ["TTL", prefijo(clave)]) do
      {:ok, ttl} -> ttl
      {:error, reason} ->
        Logger.warning("[RedisCache] Error al obtener TTL de #{clave}: #{inspect(reason)}")
        0
    end
  end

  @doc "Incrementar contador atómicamente; establece TTL si es la primera vez"
  def incrementar(clave, ttl_segundos) do
    case Redix.command(:redix, ["INCR", prefijo(clave)]) do
      {:ok, conteo} ->
        if conteo == 1 do
          Redix.command(:redix, ["EXPIRE", prefijo(clave), to_string(ttl_segundos)])
        end
        conteo
      {:error, reason} ->
        Logger.warning("[RedisCache] Error al incrementar #{clave}: #{inspect(reason)}")
        0
    end
  end

  # ═══════════════════════════════════════════════════════════
  # CACHÉ DE SESIONES (JWT + Remember Me)
  # ═══════════════════════════════════════════════════════════

  @doc "Guardar sesión de usuario con token de recordarme"
  def guardar_sesion(usuario_id, token_recordarme, ttl_dias \\ 7) do
    ttl_segundos = ttl_dias * 86400
    datos = %{
      usuario_id: usuario_id,
      token: token_recordarme,
      creado_en: DateTime.utc_now() |> DateTime.to_iso8601()
    }
    set("sesion:#{usuario_id}", datos, ttl_segundos)
  end

  @doc "Obtener sesión activa de usuario"
  def obtener_sesion(usuario_id) do
    get("sesion:#{usuario_id}")
  end

  @doc "Cerrar sesión — eliminar token de recordarme"
  def cerrar_sesion(usuario_id) do
    delete("sesion:#{usuario_id}")
  end

  @doc "Alias: eliminar sesión (usado en cambio de contraseña)"
  def eliminar_sesion(usuario_id), do: cerrar_sesion(usuario_id)

  # ═══════════════════════════════════════════════════════════
  # CACHÉ DE DASHBOARD (MÉTRICAS)
  # ═══════════════════════════════════════════════════════════

  @doc "Guardar métricas de dashboard en caché (TTL corto: 30s)"
  def cachear_metricas(periodo, metricas) do
    set("dashboard:#{periodo}", metricas, 30)
  end

  @doc "Obtener métricas de dashboard desde caché"
  def metricas_cacheadas(periodo) do
    get("dashboard:#{periodo}")
  end

  @doc "Invalidar caché de dashboard"
  def invalidar_metricas do
    periodos = ~w(dia semana mes trimestre semestre anual)
    Enum.each(periodos, fn p -> delete("dashboard:#{p}") end)
  end

  # ═══════════════════════════════════════════════════════════
  # BLOQUEOS DISTRIBUIDOS
  # ═══════════════════════════════════════════════════════════

  @doc "Adquirir bloqueo distribuido con TTL"
  def adquirir_bloqueo(recurso, propietario, ttl_segundos \\ 300) do
    clave = "lock:#{recurso}"
    case Redix.command(:redix, ["SET", clave, propietario, "NX", "EX", to_string(ttl_segundos)]) do
      {:ok, "OK"} -> {:ok, :bloqueado}
      _ -> {:error, :recurso_bloqueado}
    end
  end

  @doc "Liberar bloqueo distribuido"
  def liberar_bloqueo(recurso) do
    delete("lock:#{recurso}")
  end

  # ═══════════════════════════════════════════════════════════
  # RATE LIMITING
  # ═══════════════════════════════════════════════════════════

  @doc "Verificar rate limit — máximo `limite` requests en `ventana_segundos`"
  def verificar_rate_limit(identificador, limite, ventana_segundos) do
    clave = prefijo("rate:#{identificador}")
    ahora = System.system_time(:second)

    # Usar sorted set con timestamp como score
    pipeline = [
      ["ZREMRANGEBYSCORE", clave, "-inf", to_string(ahora - ventana_segundos)],
      ["ZADD", clave, to_string(ahora), "#{ahora}:#{:rand.uniform(999999)}"],
      ["ZCARD", clave],
      ["EXPIRE", clave, to_string(ventana_segundos)]
    ]

    case Redix.pipeline(:redix, pipeline) do
      {:ok, [_, _, conteo, _]} when is_integer(conteo) and conteo <= limite -> :ok
      {:ok, _} -> {:error, :rate_limit_excedido}
      {:error, reason} ->
        Logger.error("[RedisCache] Error rate limit: #{inspect(reason)}")
        case Mix.env() do
          :test -> :ok
          _ -> {:error, :rate_limit_excedido}
        end
    end
  end

  # ═══════════════════════════════════════════════════════════
  # LISTA NEGRA DE TOKENS (LOGOUT)
  # ═══════════════════════════════════════════════════════════

  @doc "Agregar token JWT a lista negra (cuando el usuario cierra sesión)"
  def revocar_token(jti, ttl_segundos \\ 43200) do
    set("blacklist:#{jti}", %{revocado_en: DateTime.utc_now() |> DateTime.to_iso8601()}, ttl_segundos)
  end

  @doc "Verificar si un token está revocado"
  def token_revocado?(jti) do
    exists?("blacklist:#{jti}")
  end

  # ═══════════════════════════════════════════════════════════
  # UTILIDADES
  # ═══════════════════════════════════════════════════════════

  defp prefijo(clave), do: "hotelflux:#{clave}"
end
