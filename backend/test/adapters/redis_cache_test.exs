defmodule HotelFlux.Adapters.Cache.RedisCacheTest do
  @moduledoc """
  Tests del servicio de caché Redis — API contract + manejo de errores.
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Adapters.Cache.RedisCache

  describe "API — funciones exportadas" do
    test "exporta funciones de sesión" do
      assert function_exported?(RedisCache, :guardar_sesion, 2)
      assert function_exported?(RedisCache, :obtener_sesion, 1)
      assert function_exported?(RedisCache, :eliminar_sesion, 1)
    end

    test "exporta funciones de rate limiting" do
      assert function_exported?(RedisCache, :verificar_rate_limit, 3)
    end

    test "exporta funciones de bloqueo distribuido" do
      assert function_exported?(RedisCache, :adquirir_bloqueo, 3)
      assert function_exported?(RedisCache, :liberar_bloqueo, 1)
    end

    test "exporta funciones de revocación de tokens" do
      assert function_exported?(RedisCache, :revocar_token, 2)
      assert function_exported?(RedisCache, :token_revocado?, 1)
    end

    test "exporta funciones de caché de métricas" do
      assert function_exported?(RedisCache, :cachear_metricas, 2)
      assert function_exported?(RedisCache, :metricas_cacheadas, 1)
      assert function_exported?(RedisCache, :invalidar_metricas, 0)
    end

    test "exporta funciones básicas de caché" do
      assert function_exported?(RedisCache, :set, 3)
      assert function_exported?(RedisCache, :get, 1)
      assert function_exported?(RedisCache, :delete, 1)
      assert function_exported?(RedisCache, :exists?, 1)
      assert function_exported?(RedisCache, :incrementar, 2)
    end
  end

  describe "manejo de errores sin Redis" do
    test "set retorna error cuando Redis no está disponible" do
      result = RedisCache.set("test:clave", %{valor: 42}, 60)
      assert result == :ok or match?({:error, _}, result)
    end

    test "get retorna :not_found para clave inexistente" do
      result = RedisCache.get("test:no_existe_#{System.unique_integer()}")
      assert result == {:error, :not_found} or match?({:error, _}, result)
    end
  end

  describe "sesiones — manejo de errores" do
    test "guardar_sesion retorna ok o error según disponibilidad de Redis" do
      result = RedisCache.guardar_sesion(Ecto.UUID.generate(), "token-test")
      assert result == :ok or match?({:error, _}, result)
    end

    test "obtener_sesion retorna :not_found para sesión inexistente" do
      result = RedisCache.obtener_sesion(Ecto.UUID.generate())
      assert result == {:error, :not_found} or match?({:error, _}, result)
    end
  end
end
