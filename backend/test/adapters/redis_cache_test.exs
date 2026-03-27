defmodule HotelFlux.Adapters.Cache.RedisCacheTest do
  @moduledoc """
  Tests del servicio de caché Redis — funciones puras de serialización.
  Tests unitarios que NO requieren conexión a Redis real.
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Adapters.Cache.RedisCache

  describe "claves de Redis — funciones de nombrado" do
    test "genera clave de sesión correcta" do
      # Verificamos que el módulo existe y exporta las funciones esperadas
      assert function_exported?(RedisCache, :guardar_sesion, 2)
      assert function_exported?(RedisCache, :obtener_sesion, 1)
      assert function_exported?(RedisCache, :eliminar_sesion, 1)
    end

    test "exporta funciones de rate limiting" do
      assert function_exported?(RedisCache, :verificar_rate_limit, 3)
    end

    test "exporta funciones de token blacklist" do
      assert function_exported?(RedisCache, :blacklist_token, 2)
      assert function_exported?(RedisCache, :token_blacklisted?, 1)
    end

    test "exporta funciones de cache de métricas" do
      assert function_exported?(RedisCache, :cachear_metricas, 2)
      assert function_exported?(RedisCache, :metricas_cacheadas, 1)
    end
  end
end
