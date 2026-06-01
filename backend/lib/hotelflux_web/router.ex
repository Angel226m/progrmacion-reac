defmodule HotelFluxWeb.Router do
  @moduledoc """
  Router principal de HotelFlux — Arquitectura CQRS con pipelines de seguridad.

  Seguridad OWASP + ISO 27001:
    :api          — JSON + CORS + Rate Limiting global
    :auth         — JWT obligatorio (Guardian) + Token Blacklist
    :admin_only   — Solo admin/gerente (principio de menor privilegio)
    :public_rate  — Rate limiting estricto para endpoints públicos
    :auth_rate    — Rate limiting estricto para login/registro

  Controles implementados:
    - A01:2021 Broken Access Control → RolePlug + pipelines separados
    - A04:2021 Insecure Design → Rate limiting por tipo de ruta
    - A07:2021 Auth Failures → Pipeline auth obligatorio + token blacklist
    - ISO 27001 A.9.1 → Control de acceso basado en roles (RBAC)
    - ISO 27001 A.9.2 → Gestión de acceso de usuarios
  """
  use Phoenix.Router

  import Plug.Conn
  import Phoenix.Controller

  # Pipeline para API REST con CQRS + rate limiting
  pipeline :api do
    plug :accepts, ["json"]
    plug HotelFluxWeb.Plugs.RateLimitPlug, max_requests: 120, window_seconds: 60, prefix: "api"
  end

  # Pipeline con autenticación JWT obligatoria
  pipeline :auth do
    plug HotelFluxWeb.Plugs.AuthPipeline
  end

  # Pipeline solo para admin/gerente (RBAC — ISO 27001 A.9.1)
  pipeline :admin_only do
    plug HotelFluxWeb.Plugs.RolePlug, roles: ["admin", "gerente"]
  end

  # Rate limiting estricto para autenticación (OWASP A07)
  pipeline :auth_rate do
    plug HotelFluxWeb.Plugs.RateLimitPlug, max_requests: 10, window_seconds: 60, prefix: "auth"
  end

  # Rate limiting para endpoints públicos (OWASP A04)
  pipeline :public_rate do
    plug HotelFluxWeb.Plugs.RateLimitPlug, max_requests: 30, window_seconds: 60, prefix: "public"
  end

  # ═══════════════════════════════════════════════════════════
  # MÉTRICAS PROMETHEUS (sin auth — solo acceso interno via red)
  # Prometheus scraping estándar — no contiene datos sensibles
  # ═══════════════════════════════════════════════════════════
  scope "/", HotelFluxWeb do
    get "/metrics", MetricsController, :index
  end

  # ═══════════════════════════════════════════════════════════
  # RUTAS PÚBLICAS (sin auth) — Rate limiting estricto (OWASP A07)
  # ═══════════════════════════════════════════════════════════
  scope "/api/v1", HotelFluxWeb do
    pipe_through [:api, :auth_rate]

    post "/auth/login", AuthController, :login
    post "/auth/registro", AuthController, :registro
  end

  # ═══════════════════════════════════════════════════════════
  # RUTAS PÚBLICAS — FRONTEND CLIENTES (rate limiting — OWASP A04)
  # ═══════════════════════════════════════════════════════════
  scope "/api/v1/publico", HotelFluxWeb do
    pipe_through [:api, :public_rate]

    get  "/info", PublicoController, :info_hotel
    get  "/disponibilidad", PublicoController, :disponibilidad
    get  "/habitaciones/tipos", PublicoController, :tipos_habitacion
    post "/reservar", PublicoController, :crear_reserva
    get  "/reserva/:id", PublicoController, :consultar_reserva
    get  "/servicios", PublicoController, :servicios

    # Registro de huéspedes desde la página pública
    post "/registro", PublicoController, :registro

    # Legal (Perú — Ley N° 29733)
    get "/legal/privacidad", PublicoController, :politica_privacidad
    get "/legal/terminos", PublicoController, :terminos_condiciones
    get "/legal/cookies", PublicoController, :politica_cookies
  end

  # ═══════════════════════════════════════════════════════════
  # RUTAS PROTEGIDAS (con JWT)
  # ═══════════════════════════════════════════════════════════
  scope "/api/v1", HotelFluxWeb do
    pipe_through [:api, :auth]

    # --- Auth: sesión activa ---
    post "/auth/logout", AuthController, :logout
    post "/auth/renovar", AuthController, :renovar_token
    get  "/auth/perfil", AuthController, :perfil
    put  "/auth/perfil", AuthController, :actualizar_perfil
    put  "/auth/cambiar-password", AuthController, :cambiar_password

    # === COMMANDS (CQRS — escritura) ===

    # Reservas — disparan Saga reactiva
    post "/reservas", ReservaController, :crear
    post "/reservas/directa", ReservaController, :directa
    put  "/reservas/:id/cancelar", ReservaController, :cancelar

    # Check-in / Check-out — disparan eventos reactivos
    post "/checkin", CheckinController, :realizar_checkin
    post "/checkout", CheckoutController, :realizar_checkout

    # Habitaciones — cambios de estado
    put  "/habitaciones/:id/estado", HabitacionController, :cambiar_estado
    post "/habitaciones", HabitacionController, :crear

    # Productos — venta a habitación
    post "/productos/venta", ProductoController, :vender
    post "/productos", ProductoController, :crear

    # Tareas de limpieza — actualización de estado
    put "/tareas/:id/estado", TareaController, :actualizar_estado

    # Huéspedes
    post "/huespedes", HuespedController, :crear
    put  "/huespedes/:id", HuespedController, :actualizar

    # === QUERIES (CQRS — lectura) ===
    get "/habitaciones", QueryController, :listar_habitaciones
    get "/habitaciones/:id", QueryController, :obtener_habitacion
    get "/reservas", QueryController, :listar_reservas
    get "/reservas/:id", QueryController, :obtener_reserva
    get "/huespedes", QueryController, :listar_huespedes
    get "/huespedes/:id", QueryController, :obtener_huesped
    get "/productos", QueryController, :listar_productos
    get "/tareas", QueryController, :listar_tareas
    get "/tareas/empleado/:empleado_id", QueryController, :tareas_por_empleado
    get "/consumos/reserva/:reserva_id", QueryController, :consumos_por_reserva
    get "/eventos", QueryController, :listar_eventos

    # Cliente / Huésped autenticado
    get "/cliente/reservas", ClienteController, :mis_reservas
    get "/cliente/reservas/:id", ClienteController, :detalle_reserva
    put "/cliente/reservas/:id/cancelar", ClienteController, :cancelar_reserva

    # Dashboard básico (lectura para cualquier usuario autenticado)
    get "/dashboard/metricas", QueryController, :metricas_dashboard
    get "/dashboard/ocupacion", QueryController, :ocupacion_por_hora
    get "/dashboard/ingresos", QueryController, :ingresos_del_dia
    get "/dashboard/top-productos", QueryController, :top_productos
  end

  # ═══════════════════════════════════════════════════════════
  # CQRS QUERY scope — prefijo /query (convención frontend)
  # Mismas acciones del QueryController, rutas más explícitas
  # ═══════════════════════════════════════════════════════════
  scope "/api/v1/query", HotelFluxWeb do
    pipe_through [:api, :auth]

    get "/habitaciones", QueryController, :listar_habitaciones
    get "/habitaciones/:id", QueryController, :obtener_habitacion
    get "/reservas/activas", QueryController, :reservas_activas
    get "/reservas", QueryController, :listar_reservas
    get "/reservas/:id", QueryController, :obtener_reserva
    get "/huespedes", QueryController, :listar_huespedes
    get "/productos", QueryController, :listar_productos
    get "/tareas", QueryController, :listar_tareas
    get "/dashboard/metricas", QueryController, :metricas_dashboard
  end

  # ═══════════════════════════════════════════════════════════
  # RUTAS ADMIN (solo admin/gerente)
  # ═══════════════════════════════════════════════════════════
  scope "/api/v1/admin", HotelFluxWeb do
    pipe_through [:api, :auth, :admin_only]

    # --- Gestión de pisos ---
    get    "/pisos", AdminController, :listar_pisos
    post   "/pisos", AdminController, :crear_piso
    put    "/pisos/:id", AdminController, :actualizar_piso
    delete "/pisos/:id", AdminController, :eliminar_piso

    # --- Gestión de habitaciones (edición/eliminación admin) ---
    put    "/habitaciones/:id", AdminController, :actualizar_habitacion
    delete "/habitaciones/:id", AdminController, :eliminar_habitacion

    # --- Gestión de personal ---
    get    "/personal", AdminController, :listar_personal
    post   "/personal", AdminController, :crear_personal
    put    "/personal/:id", AdminController, :actualizar_personal
    delete "/personal/:id", AdminController, :eliminar_personal
    get    "/personal/conteo", AdminController, :conteo_personal

    # --- Gestión de turnos y horarios ---
    get  "/turnos", AdminController, :listar_turnos
    post "/horarios", AdminController, :asignar_horario
    post "/horarios/semana", AdminController, :generar_horarios_semana
    get  "/horarios/semana", AdminController, :horarios_semana
    get  "/horarios/empleado/:id", AdminController, :horarios_empleado
    put  "/horarios/:id/estado", AdminController, :actualizar_asistencia

    # --- Dashboard analítico avanzado (por período) ---
    get "/dashboard", AdminController, :dashboard
    get "/analitica/reservas", AdminController, :analitica_reservas
    get "/analitica/ingresos", AdminController, :analitica_ingresos
    get "/analitica/productos", AdminController, :analitica_productos
    get "/analitica/habitaciones", AdminController, :analitica_habitaciones
    get "/analitica/ocupacion", AdminController, :analitica_ocupacion

    # --- Exportación CSV/Excel ---
    get "/exportar/reservas", AdminController, :exportar_reservas
    get "/exportar/ingresos", AdminController, :exportar_ingresos
    get "/exportar/personal", AdminController, :exportar_personal
  end

  # ═══════════════════════════════════════════════════════════
  # HEALTH CHECK
  # ═══════════════════════════════════════════════════════════
  scope "/", HotelFluxWeb do
    pipe_through :api
    get "/health",          HealthController, :check
    get "/health/detailed", HealthController, :detailed
  end
end
