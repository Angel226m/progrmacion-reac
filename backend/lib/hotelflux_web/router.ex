defmodule HotelFluxWeb.Router do
  @moduledoc """
  Router principal de HotelFlux — Arquitectura CQRS con pipelines de seguridad.

  Pipelines:
    :api          — JSON + CORS
    :auth         — JWT obligatorio (Guardian)
    :admin_only   — Solo admin/gerente

  Rutas organizadas por:
    1. Públicas (login, registro, health)
    2. Protegidas (operaciones del hotel)
    3. Admin (gestión, dashboards, exportación)
  """
  use Phoenix.Router

  import Plug.Conn
  import Phoenix.Controller

  # Pipeline para API REST con CQRS
  pipeline :api do
    plug :accepts, ["json"]
  end

  # Pipeline con autenticación JWT obligatoria
  pipeline :auth do
    plug HotelFluxWeb.Plugs.AuthPipeline
  end

  # Pipeline solo para admin/gerente
  pipeline :admin_only do
    plug HotelFluxWeb.Plugs.RolePlug, roles: ["admin", "gerente"]
  end

  # ═══════════════════════════════════════════════════════════
  # RUTAS PÚBLICAS (sin auth)
  # ═══════════════════════════════════════════════════════════
  scope "/api/v1", HotelFluxWeb do
    pipe_through :api

    post "/auth/login", AuthController, :login
    post "/auth/registro", AuthController, :registro
  end

  # ═══════════════════════════════════════════════════════════
  # RUTAS PÚBLICAS — FRONTEND CLIENTES (sin autenticación)
  # ═══════════════════════════════════════════════════════════
  scope "/api/v1/publico", HotelFluxWeb do
    pipe_through :api

    get  "/info", PublicoController, :info_hotel
    get  "/disponibilidad", PublicoController, :disponibilidad
    get  "/habitaciones/tipos", PublicoController, :tipos_habitacion
    post "/reservar", PublicoController, :crear_reserva
    get  "/reserva/:id", PublicoController, :consultar_reserva
    get  "/servicios", PublicoController, :servicios

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

    # Dashboard básico (lectura para cualquier usuario autenticado)
    get "/dashboard/metricas", QueryController, :metricas_dashboard
    get "/dashboard/ocupacion", QueryController, :ocupacion_por_hora
    get "/dashboard/ingresos", QueryController, :ingresos_del_dia
    get "/dashboard/top-productos", QueryController, :top_productos
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
    get "/health", HealthController, :check
  end
end
