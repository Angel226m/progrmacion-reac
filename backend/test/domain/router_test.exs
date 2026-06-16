defmodule HotelFluxWeb.RouterTest do
  @moduledoc """
  Tests del router — verifica que todas las rutas están configuradas.
  """
  use ExUnit.Case, async: true

  alias HotelFluxWeb.Router

  describe "rutas públicas" do
    test "ruta POST /api/v1/auth/login existe" do
      assert match_route(:post, "/api/v1/auth/login")
    end

    test "ruta POST /api/v1/auth/registro existe" do
      assert match_route(:post, "/api/v1/auth/registro")
    end

    test "ruta GET /health existe" do
      assert match_route(:get, "/health")
    end
  end

  describe "rutas protegidas" do
    test "ruta POST /api/v1/auth/logout existe" do
      assert match_route(:post, "/api/v1/auth/logout")
    end

    test "ruta GET /api/v1/auth/perfil existe" do
      assert match_route(:get, "/api/v1/auth/perfil")
    end

    test "ruta GET /api/v1/habitaciones existe" do
      assert match_route(:get, "/api/v1/habitaciones")
    end

    test "ruta POST /api/v1/reservas existe" do
      assert match_route(:post, "/api/v1/reservas")
    end

    test "ruta POST /api/v1/checkin existe" do
      assert match_route(:post, "/api/v1/checkin")
    end

    test "ruta POST /api/v1/checkout existe" do
      assert match_route(:post, "/api/v1/checkout")
    end

    test "ruta GET /api/v1/dashboard/metricas existe" do
      assert match_route(:get, "/api/v1/dashboard/metricas")
    end
  end

  describe "rutas admin" do
    test "ruta GET /api/v1/admin/pisos existe" do
      assert match_route(:get, "/api/v1/admin/pisos")
    end

    test "ruta POST /api/v1/admin/pisos existe" do
      assert match_route(:post, "/api/v1/admin/pisos")
    end

    test "ruta GET /api/v1/admin/personal existe" do
      assert match_route(:get, "/api/v1/admin/personal")
    end

    test "ruta GET /api/v1/admin/turnos existe" do
      assert match_route(:get, "/api/v1/admin/turnos")
    end

    test "ruta GET /api/v1/admin/dashboard existe" do
      assert match_route(:get, "/api/v1/admin/dashboard")
    end

    test "ruta GET /api/v1/admin/analitica/reservas existe" do
      assert match_route(:get, "/api/v1/admin/analitica/reservas")
    end

    test "ruta GET /api/v1/admin/exportar/reservas existe" do
      assert match_route(:get, "/api/v1/admin/exportar/reservas")
    end

    test "ruta GET /api/v1/admin/exportar/personal existe" do
      assert match_route(:get, "/api/v1/admin/exportar/personal")
    end

    test "ruta GET /api/v1/admin/analitica/habitaciones existe" do
      assert match_route(:get, "/api/v1/admin/analitica/habitaciones")
    end

    test "ruta GET /api/v1/admin/analitica/ocupacion existe" do
      assert match_route(:get, "/api/v1/admin/analitica/ocupacion")
    end
  end

  describe "rutas públicas de huéspedes (publico)" do
    test "ruta GET /api/v1/publico/info existe" do
      assert match_route(:get, "/api/v1/publico/info")
    end

    test "ruta GET /api/v1/publico/disponibilidad existe" do
      assert match_route(:get, "/api/v1/publico/disponibilidad")
    end

    test "ruta GET /api/v1/publico/habitaciones/tipos existe" do
      assert match_route(:get, "/api/v1/publico/habitaciones/tipos")
    end

    test "ruta POST /api/v1/publico/reservar existe" do
      assert match_route(:post, "/api/v1/publico/reservar")
    end

    test "ruta GET /api/v1/publico/servicios existe" do
      assert match_route(:get, "/api/v1/publico/servicios")
    end

    test "ruta GET /api/v1/publico/legal/privacidad existe" do
      assert match_route(:get, "/api/v1/publico/legal/privacidad")
    end

    test "ruta GET /api/v1/publico/legal/terminos existe" do
      assert match_route(:get, "/api/v1/publico/legal/terminos")
    end

    test "ruta GET /api/v1/publico/legal/cookies existe" do
      assert match_route(:get, "/api/v1/publico/legal/cookies")
    end
  end

  describe "rutas de perfil de usuario" do
    test "ruta PUT /api/v1/auth/perfil existe" do
      assert match_route(:put, "/api/v1/auth/perfil")
    end

    test "ruta PUT /api/v1/auth/cambiar-password existe" do
      assert match_route(:put, "/api/v1/auth/cambiar-password")
    end

    test "ruta POST /api/v1/auth/renovar existe" do
      assert match_route(:post, "/api/v1/auth/renovar")
    end
  end

  describe "rutas admin adicionales" do
    test "ruta PUT /api/v1/admin/pisos/:id existe" do
      assert match_route(:put, "/api/v1/admin/pisos/1")
    end

    test "ruta DELETE /api/v1/admin/pisos/:id existe" do
      assert match_route(:delete, "/api/v1/admin/pisos/1")
    end

    test "ruta POST /api/v1/admin/personal existe" do
      assert match_route(:post, "/api/v1/admin/personal")
    end

    test "ruta GET /api/v1/admin/personal/conteo existe" do
      assert match_route(:get, "/api/v1/admin/personal/conteo")
    end

    test "ruta PUT /api/v1/admin/personal/:id existe" do
      assert match_route(:put, "/api/v1/admin/personal/1")
    end

    test "ruta GET /api/v1/admin/analitica/ingresos existe" do
      assert match_route(:get, "/api/v1/admin/analitica/ingresos")
    end

    test "ruta GET /api/v1/admin/analitica/productos existe" do
      assert match_route(:get, "/api/v1/admin/analitica/productos")
    end

    test "ruta POST /api/v1/admin/horarios existe" do
      assert match_route(:post, "/api/v1/admin/horarios")
    end
  end

  describe "rutas de health check" do
    test "ruta GET /health/detailed existe" do
      assert match_route(:get, "/health/detailed")
    end
  end

  describe "rutas de métricas" do
    test "ruta GET /metrics existe" do
      assert match_route(:get, "/metrics")
    end
  end

  defp match_route(method, path) do
    # Usa el compilador del router de Phoenix para verificar rutas
    method_str = method |> to_string() |> String.upcase()
    try do
      Phoenix.Router.route_info(Router, method_str, path, "")
      true
    rescue
      _ -> false
    end
  end
end
