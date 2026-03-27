# 🏨 HotelFlux — Sistema de Gestión Hotelera Reactiva

> **Proyecto académico** para la materia de **Programación Funcional y Reactiva** — Noveno Ciclo

Sistema completo de gestión hotelera construido con **Elixir/Phoenix** (backend funcional) y **React/RxJS** (frontend reactivo), demostrando patrones avanzados de programación funcional y reactiva en un escenario real.

---

## 📐 Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────┐
│                    NGINX (puerto 80/443)                        │
│     Reverse Proxy + WebSocket + Rate Limiting + OWASP Headers  │
├────────────────────┬───────────────────────────────────────────┤
│  /api/* → Backend  │  /socket → WebSocket → Backend            │
│  /*     → Frontend │  /api/auth/* → Rate Limit 5r/min          │
│                    │  /api/v1/publico/* → Rate Limit 15r/s     │
├────────────────────┴───────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────┐    ┌────────────────────────────┐   │
│  │   Phoenix Backend    │    │     React Frontend          │   │
│  │   (Elixir 1.17)      │    │     (React 19 + RxJS)      │   │
│  │                      │    │                            │   │
│  │  Hexagonal Arch      │◄──►│  Clean Architecture        │   │
│  │  CQRS + ES           │ WS │  Streams Reactivos         │   │
│  │  Saga Pattern        │    │  Tailwind CSS 4            │   │
│  │  Soft Delete         │    │  Recharts + Analytics      │   │
│  │  OWASP Security      │    │  Role-based Guards         │   │
│  │  Oban Workers        │    │  Página Pública Clientes   │   │
│  └────┬─────┬─────┬─────┘    └────────────────────────────┘   │
│       │     │     │                                            │
│  ┌────▼──┐ ┌▼─────▼──┐    ┌───────────┐  ┌──────────┐       │
│  │Postgre│ │  Redis   │    │Prometheus │  │ Grafana  │       │
│  │SQL 18 │ │   8      │    │+ Alertas  │  │+Loki Logs│       │
│  └───────┘ └──────────┘    └───────────┘  └──────────┘       │
└────────────────────────────────────────────────────────────────┘
```

---

## 🧬 Patrones Demostrados

### Programación Funcional (Backend — Elixir)

| Patrón | Implementación |
|--------|---------------|
| **Funciones puras** | Entidades del dominio como structs inmutables con funciones de transformación |
| **Inmutabilidad** | Todos los datos son inmutables por defecto en Elixir |
| **Pattern Matching** | Usado extensivamente en controllers, channels y use cases |
| **Pipe Operator** | Composición funcional con `\|>` en toda la base de código |
| **Higher-Order Functions** | `Enum.map/2`, `Enum.filter/2`, `Enum.reduce/3` para transformaciones |
| **Recursión** | Procesamiento de listas de eventos en Event Sourcing |

### Programación Reactiva (Frontend — RxJS + React)

| Patrón | Implementación |
|--------|---------------|
| **Observable Streams** | Phoenix Channels → RxJS Observables con `createChannelStream` |
| **Operador scan/reduce** | Acumulación de estado de habitaciones, tareas de limpieza |
| **Backpressure** | Ventanas deslizantes (`sliding window`) de 60 puntos en historial |
| **Hot Observables** | `shareReplay(1)` para multicasting a múltiples suscriptores |
| **Composición de streams** | `merge`, `combineLatest`, `map`, `distinctUntilChanged` |
| **Bridge Observable→React** | Hook `useObservable` conecta streams RxJS con useState |

### Patrones de Arquitectura

| Patrón | Ubicación |
|--------|-----------|
| **Arquitectura Hexagonal** | Backend — puertos, adaptadores, dominio desacoplado |
| **Clean Architecture** | Frontend — domain → streams → hooks → components → pages |
| **CQRS** | Separación de comandos (escritura) y queries (lectura) en API |
| **Event Sourcing** | Tabla `eventos_dominio`, reconstrucción de estado |
| **Saga Pattern** | Reservas con 5 pasos y compensación automática |
| **Observer Pattern** | Phoenix PubSub → Channels → RxJS Subjects |
| **Soft Delete** | Eliminación lógica en las 11 entidades del sistema |

---

## 🔐 Seguridad (OWASP + ISO 27001)

| Medida | Detalle |
|--------|---------|
| **JWT HTTP-only Cookies** | Tokens almacenados en cookies seguras, no accesibles por JS |
| **Rate Limiting** | Redis sorted-set sliding window (10 intentos/min login, 30r/s API) |
| **Token Blacklist** | Logout invalida tokens en Redis |
| **Password OWASP** | Mínimo 8 chars + mayúscula + número obligatorio |
| **Bcrypt** | Hash con 12 rounds (prod) + timing attack protection |
| **SameSite + Secure** | Cookies con SameSite=Lax y flag Secure |
| **Remember Me** | TTL configurable: 12h normal / 7 días con remember_me |
| **Soft Delete** | Datos nunca se eliminan físicamente (auditoría) |
| **Admin-only Pipeline** | Middleware Guardian + RolePlug para rutas administrativas |
| **CSP Headers** | Content-Security-Policy, X-Frame-Options, X-Content-Type-Options |
| **Permissions-Policy** | Bloquea acceso a cámara, micrófono y geolocalización |
| **Non-root containers** | Dockerfiles ejecutan como usuario sin privilegios |

---

## 🗂️ Estructura del Proyecto

```
funcionalreactiva/
├── backend/                              # Elixir/Phoenix API
│   ├── lib/hotelflux/
│   │   ├── domain/                       # 12 entidades puras del dominio
│   │   │   ├── habitacion.ex             # + soft delete + clasificación
│   │   │   ├── reserva.ex               # + soft delete
│   │   │   ├── huesped.ex               # + soft delete
│   │   │   ├── producto.ex              # + soft delete
│   │   │   ├── usuario.ex               # + OWASP passwords + soft delete
│   │   │   ├── piso.ex                  # NUEVO — Gestión de pisos
│   │   │   ├── turno.ex                 # NUEVO — Turnos laborales
│   │   │   ├── horario_personal.ex      # NUEVO — Horarios/asistencia
│   │   │   ├── tarea_limpieza.ex        # + soft delete
│   │   │   ├── consumo.ex              # + soft delete
│   │   │   ├── pago.ex                 # + soft delete
│   │   │   └── events.ex               # Eventos de dominio (ES)
│   │   ├── ports/                       # Puertos (interfaces)
│   │   ├── use_cases/                   # Casos de uso + Saga
│   │   ├── workers/                     # Oban background jobs
│   │   │   ├── email_worker.ex          # Emails con reintentos
│   │   │   └── limpieza_timeout_worker.ex # NUEVO — Alerta limpieza 45min
│   │   ├── adapters/
│   │   │   ├── repos/                   # 10 repositorios con soft delete
│   │   │   │   ├── habitacion_repo.ex
│   │   │   │   ├── reserva_repo.ex
│   │   │   │   ├── huesped_repo.ex
│   │   │   │   ├── producto_repo.ex
│   │   │   │   ├── tarea_repo.ex
│   │   │   │   ├── piso_repo.ex         # NUEVO
│   │   │   │   ├── turno_repo.ex        # NUEVO
│   │   │   │   ├── horario_repo.ex      # NUEVO
│   │   │   │   ├── usuario_repo.ex      # NUEVO
│   │   │   │   └── analitica_repo.ex    # MEJORADO — +5 funciones analítica avanzada
│   │   │   └── cache/
│   │   │       └── redis_cache.ex       # NUEVO — Cache + Rate Limit + Blacklist
│   │   └── auth/                        # JWT Guardian pipeline
│   ├── lib/hotelflux_web/
│   │   ├── controllers/
│   │   │   ├── auth_controller.ex       # REESCRITO — OWASP + HTTP-only cookies
│   │   │   ├── admin_controller.ex      # NUEVO — 280+ líneas, CRUD completo
│   │   │   ├── habitacion_controller.ex
│   │   │   ├── reserva_controller.ex
│   │   │   ├── query_controller.ex
│   │   │   └── publico_controller.ex   # NUEVO — 9 endpoints públicos (clientes)
│   │   ├── channels/                    # Phoenix Channels (WebSocket)
│   │   ├── router.ex                    # REESCRITO — rutas admin + públicas + perfil
│   ├── priv/repo/
│   │   ├── migrations/                  # 9 migraciones + soft delete
│   │   └── seeds.exs                    # REESCRITO — datos demo completos
│   ├── test/                            # 15+ archivos de test ExUnit
│   └── config/
│       ├── config.exs
│       ├── dev.exs
│       ├── test.exs
│       ├── runtime.exs
│       └── prod.exs                     # NUEVO — Fix Docker build
│
├── frontend-reception/                   # React SPA
│   ├── src/
│   │   ├── domain/types.ts              # Tipos readonly — re-export de entidades
│   │   ├── domain/entidades/            # NUEVO — 9 archivos entidad individuales
│   │   ├── services/
│   │   │   ├── api.ts                   # CQRS client + offline fallback
│   │   │   ├── admin.api.ts             # NUEVO — API admin tipada
│   │   │   └── publico.api.ts           # NUEVO — API pública para clientes
│   │   ├── streams/                     # RxJS Observable Streams
│   │   ├── hooks/                       # Bridge Observable → React
│   │   ├── components/
│   │   │   ├── shared/
│   │   │   │   ├── Layout.tsx           # ACTUALIZADO — nav admin items
│   │   │   │   └── Icons.tsx            # ACTUALIZADO — +2 iconos admin
│   │   │   ├── habitaciones/            # Mapa SVG, cards, leyenda
│   │   │   ├── dashboard/              # KPIs, gráficas Recharts
│   │   │   ├── reservas/               # Form, lista, Saga progress
│   │   │   ├── productos/              # Catálogo, modal venta
│   │   │   ├── limpieza/               # Tareas mobile-first
│   │   │   └── notificaciones/         # Panel de alertas
│   │   ├── pages/
│   │   │   ├── PersonalPage.tsx         # NUEVO — Gestión de personal
│   │   │   ├── AnaliticaPage.tsx        # NUEVO — Dashboard analítico
│   │   │   ├── PerfilPage.tsx           # NUEVO — Perfil usuario + cambiar contraseña
│   │   │   ├── LegalPage.tsx            # NUEVO — Privacidad/Términos/Cookies (Perú)
│   │   │   ├── ReservaClientePage.tsx   # MEJORADO — API real + S/ + fallback
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── ...
│   │   ├── test/                        # MEJORADO — 8 archivos Vitest
│   │   ├── App.tsx                      # ACTUALIZADO — rutas admin
│   │   └── index.css                    # Tailwind 4 + tema hotel
│   └── vite.config.ts                   # ACTUALIZADO — Vitest config
│
├── nginx/nginx.conf                     # Reverse proxy + rate limiting
├── infra/                               # Monitoreo + Observabilidad
│   ├── prometheus/
│   │   ├── prometheus.yml               # Scraping config + Nginx metrics
│   │   └── alert_rules.yml             # NUEVO — Alertas críticas
│   ├── loki/                            # NUEVO — Log aggregation
│   │   ├── loki-config.yml
│   │   └── promtail-config.yml
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/datasource.yml
│       │   └── dashboards/dashboard.yml
│       └── dashboards/hotelflux-main.json
├── docker-compose.yml                   # MEJORADO — Desarrollo local
├── docker-compose.prod.yml              # NUEVO — Producción VPS
├── .env.example                         # NUEVO — Variables de entorno
└── README.md                            # REESCRITO — Documentación completa
```

---

## 🚀 Inicio Rápido

### Prerequisitos

- [Docker](https://www.docker.com/) y Docker Compose v2+
- (Opcional) Elixir 1.17+ y Node.js 22+ para desarrollo local

### Con Docker — Desarrollo Local

```bash
# Clonar el repositorio
git clone <repo-url>
cd funcionalreactiva

# Levantar todos los servicios
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f backend

# Ejecutar migraciones + seeds
docker compose exec backend ./bin/hotelflux eval 'HotelFlux.Release.migrate()'
docker compose exec backend ./bin/hotelflux eval 'HotelFlux.Release.seed()'
```

**Acceder a:** `http://localhost`

### Con Docker — Producción VPS

```bash
# Copiar y configurar variables de entorno
cp .env.example .env
nano .env   # Configurar secretos reales

# Desplegar con monitoreo
docker compose -f docker-compose.prod.yml up -d

# Verificar health
docker compose -f docker-compose.prod.yml ps
curl http://tu-dominio.com/health
```

**Grafana:** `http://tu-dominio.com:3001` (admin / HotelFlux2026!)

### Desarrollo Local (sin Docker)

#### Backend (Elixir)

```bash
cd backend
mix deps.get
mix ecto.setup        # create + migrate + seed
mix phx.server        # http://localhost:4000
```

#### Frontend (React)

```bash
cd frontend-reception
npm install
npm run dev           # http://localhost:3000
npm run test          # Vitest
npm run test:watch    # Vitest en modo watch
```

#### Tests Backend

```bash
cd backend
mix test                    # Todos los tests
mix test test/domain/       # Solo tests de dominio
mix test --trace            # Modo verbose
```

---

## 👥 Roles y Acceso

| Rol | Vista Principal | Acceso |
|-----|----------------|--------|
| **admin** | Dashboard | Todas las secciones + **Personal** + **Analítica** + Configuración |
| **recepcionista** | Recepción | Dashboard, Recepción, Reservas, Huéspedes, Productos |
| **limpieza** | Limpieza | Solo Limpieza (mobile-first) |
| **mantenimiento** | Dashboard | Dashboard, Configuración |

### Credenciales Demo

| Usuario | Email | Password | Rol |
|---------|-------|----------|-----|
| Administrador | admin@hotelflux.com | Admin123! | admin |
| Recepcionista | recepcion@hotelflux.com | Recep123! | recepcionista |
| Gerente | ana@hotelflux.com | Gerente123! | admin |
| Limpieza | limpieza1@hotelflux.com | Limpieza123! | limpieza |
| Mantenimiento | manten1@hotelflux.com | Manten123! | mantenimiento |

> ⚠️ Las contraseñas cumplen OWASP: mínimo 8 caracteres + mayúscula + número

---

## 📝 API Endpoints

### Autenticación (públicas)
```
POST /api/v1/auth/login       → { email, password, remember_me? }
POST /api/v1/auth/registro    → { nombre, email, password, rol }
```

### Autenticación (protegidas — JWT)
```
POST /api/v1/auth/logout         → Blacklist token en Redis
POST /api/v1/auth/renovar        → Renovar JWT
GET  /api/v1/auth/perfil         → Datos del usuario actual
PUT  /api/v1/auth/perfil         → Actualizar nombre/email
PUT  /api/v1/auth/cambiar-password → Cambiar contraseña (OWASP)
```

### Comandos (CQRS — Escritura, requieren JWT)
```
POST /api/v1/reservas          → Crear reserva (inicia Saga)
PUT  /api/v1/reservas/:id      → Actualizar reserva
POST /api/v1/checkin/:id       → Check-in
POST /api/v1/checkout/:id      → Check-out
POST /api/v1/ventas            → Registrar venta de producto
```

### Queries (CQRS — Lectura, requieren JWT)
```
GET /api/v1/habitaciones       → Listar habitaciones (soft delete filter)
GET /api/v1/habitaciones/:id   → Detalle habitación
GET /api/v1/reservas           → Listar reservas
GET /api/v1/reservas/activas   → Reservas activas
GET /api/v1/huespedes          → Listar huéspedes
GET /api/v1/productos          → Listar productos
GET /api/v1/tareas-limpieza    → Listar tareas
GET /api/v1/dashboard          → Métricas tiempo real
```

### Admin (requieren JWT + rol admin)
```
# Pisos
GET    /api/v1/admin/pisos           → Listar pisos
POST   /api/v1/admin/pisos           → Crear piso
PUT    /api/v1/admin/pisos/:id       → Actualizar piso
DELETE /api/v1/admin/pisos/:id       → Soft delete piso

# Personal
GET    /api/v1/admin/personal        → Listar empleados (?rol=limpieza)
POST   /api/v1/admin/personal        → Crear empleado
PUT    /api/v1/admin/personal/:id    → Actualizar empleado
DELETE /api/v1/admin/personal/:id    → Soft delete empleado
GET    /api/v1/admin/personal/conteo → Conteo por rol

# Turnos y Horarios
GET    /api/v1/admin/turnos              → Listar turnos
POST   /api/v1/admin/horarios            → Asignar horario
POST   /api/v1/admin/horarios/semana     → Generar semana completa
GET    /api/v1/admin/horarios/semana     → Ver semana actual
GET    /api/v1/admin/horarios/:id        → Horarios de empleado
PUT    /api/v1/admin/horarios/:id/asistencia → Actualizar asistencia

# Dashboard y Analítica
GET    /api/v1/admin/dashboard           → KPIs con caché Redis (?periodo=mes)
GET    /api/v1/admin/analitica/reservas  → Reservas por período
GET    /api/v1/admin/analitica/ingresos  → Ingresos por período
GET    /api/v1/admin/analitica/productos → Productos populares (con granularidad)
GET    /api/v1/admin/analitica/habitaciones → Habitaciones más usadas + ocupación por tipo
GET    /api/v1/admin/analitica/ocupacion → Ocupación actual y por tipo de habitación

# Exportar CSV
GET    /api/v1/admin/exportar/reservas   → CSV de reservas
GET    /api/v1/admin/exportar/ingresos   → CSV de ingresos
GET    /api/v1/admin/exportar/personal   → CSV de personal
```

### WebSocket (Phoenix Channels)
```
Topic: hotel:lobby
  → habitacion:update      (cambios de estado en tiempo real)
  → reserva:update         (actualizaciones de reservas)
  → dashboard:metrics      (métricas en vivo)
  → notificacion:nueva     (alertas del sistema)
  → limpieza:update        (cambios en tareas)
  → saga:progress          (progreso del Saga pattern)
```

### API Pública — Huéspedes (sin autenticación)
```
GET  /api/v1/publico/info                → Información del hotel (cached Redis 1h)
GET  /api/v1/publico/disponibilidad      → Buscar habitaciones disponibles (?fecha_entrada, fecha_salida, tipo, capacidad)
GET  /api/v1/publico/habitaciones/tipos  → Tipos de habitación con precios
POST /api/v1/publico/reservar            → Crear reserva como huésped (Saga Pattern)
GET  /api/v1/publico/reserva/:id         → Consultar estado de reserva
GET  /api/v1/publico/servicios           → Catálogo de servicios por categoría
GET  /api/v1/publico/legal/privacidad    → Política de privacidad (Ley N° 29733 Perú)
GET  /api/v1/publico/legal/terminos      → Términos y condiciones (IGV, Libro de Reclamaciones)
GET  /api/v1/publico/legal/cookies       → Política de cookies
```

---

## 🔄 Flujo Reactivo en Tiempo Real

```
Phoenix PubSub                    Frontend
     │                               │
     ▼                               │
Phoenix Channel ──── WebSocket ────► websocket.stream.ts
     │                               │
     │                          createChannelStream()
     │                               │
     │                               ▼
     │                     habitacion.stream.ts
     │                          scan((acc, evt) => {
     │                            // Acumula estado inmutablemente
     │                            const mapa = new Map(acc);
     │                            mapa.set(evt.id, evt);
     │                            return mapa;
     │                          })
     │                               │
     │                               ▼
     │                      useHabitacionStream()
     │                      useObservable(stream$)
     │                               │
     │                               ▼
     │                        React Component
     │                        (re-render reactivo)
```

---

## 🎭 Saga Pattern — Reserva con Compensación

```
Paso 1: Validar disponibilidad
    ↓ (éxito)
Paso 2: Bloquear habitación (Redis distributed lock)
    ↓ (éxito)
Paso 3: Crear reserva en BD
    ↓ (éxito)
Paso 4: Confirmar pago
    ↓ (éxito)
Paso 5: Notificar (PubSub + Channel)
    ↓ (éxito)
   ✅ Reserva completada

Si CUALQUIER paso falla:
    → Compensación automática (rollback inverso)
    → Evento de compensación en Event Sourcing
```

---

## 🌐 Página Pública para Clientes

El sistema incluye una página de reservas para huéspedes sin necesidad de autenticación:

- **Búsqueda de disponibilidad** por rango de fechas, tipo de habitación y capacidad
- **Tipos de habitación** con precios, amenidades y fotos descriptivas
- **Reserva en línea** con código de confirmación único (HF-XXXXXXXX)
- **Consulta de reserva** por ID
- **Catálogo de servicios** agrupados por categoría
- **Moneda peruana** (S/ — Soles) con IGV 18% incluido

### Cumplimiento Legal — Perú 🇵🇪

| Documento | Contenido |
|-----------|-----------|
| **Política de Privacidad** | Ley N° 29733 (Protección de Datos Personales), derechos ARCO, autoridad ANPDP |
| **Términos y Condiciones** | Código de Protección al Consumidor, Libro de Reclamaciones, IGV 18%, check-in 14:00/check-out 12:00 |
| **Política de Cookies** | Categorías de cookies, control de consentimiento, duración y propósito |

---

## 📊 Analytics Dashboard (Mejorado)

El panel de analítica (`/analitica`) ofrece:

- **KPIs en tiempo real**: Ocupación %, Ingresos, Reservas, Limpieza promedio
- **Gráficas interactivas** (Recharts): Ingresos diarios, Reservas por estado, Top productos, Ventas por categoría
- **Períodos configurables**: Día, Semana, Mes, Trimestre, Semestre, Anual
- **Granularidad temporal**: Ventas por día/semana/mes con DATE_TRUNC
- **Ocupación por tipo**: Desglose de habitaciones por estado y tipo
- **Habitaciones más usadas**: Ranking de habitaciones con ingresos
- **Ingresos por habitación**: Revenue per room por período
- **Caché Redis**: Métricas cacheadas 30s con indicador visual (⚡ Caché / 🔄 BD)
- **Exportación CSV**: Descarga directa de datos por sección

---

## 🐳 Docker Services

| Servicio | Imagen | Puerto | Descripción |
|----------|--------|--------|-------------|
| **postgres** | postgres:18-alpine | 5432 | Base de datos (soft delete) |
| **redis** | redis:8-alpine | 6379 | Cache + Rate Limit + Locks + Blacklist |
| **backend** | Elixir 1.17 multi-stage | 4000 | API REST + WebSocket + Admin + API Pública |
| **frontend** | Node 23 → Nginx | 3000 | SPA React con Recharts + Página Clientes |
| **nginx** | nginx:alpine | 80/443 | Reverse proxy + WS + Rate Limiting + OWASP Headers |
| **prometheus** | prom/prometheus | 9090 | Métricas + Alert Rules |
| **grafana** | grafana/grafana | 3001 | Dashboards monitoreo + Loki logs |
| **loki** | grafana/loki | — | Agregación centralizada de logs (7d retención) |
| **promtail** | grafana/promtail | — | Recolector de logs → Loki |

---

## 🛠️ Tecnologías

### Backend
- **Elixir 1.17** + **Phoenix 1.7.18** + **Bandit** HTTP server
- **Ecto** — ORM funcional con changesets + soft delete
- **Guardian** — JWT con HTTP-only cookies
- **Oban** — Jobs en background
- **Redix** — Redis: cache, locks, rate limiting, token blacklist
- **Bcrypt** — Hash de contraseñas (12 rounds)
- **PostgreSQL 18** — Base de datos con índices parciales

### Frontend
- **React 19** — UI declarativa con hooks
- **TypeScript 5.7** — Tipado estático estricto
- **RxJS 7.8** — Programación reactiva (Observables)
- **Tailwind CSS 4** — Utility-first responsive
- **Recharts 2.15** — Gráficas declarativas (Line, Bar, Pie)
- **Vite 6** — Build + Vitest testing
- **date-fns 4.1** — Manipulación de fechas funcional

### Testing
- **ExUnit** — 15+ archivos de test backend (dominio, repos, router, channels, workers, soft delete)
- **Vitest** + **Testing Library** — 8 archivos de test frontend (hooks, API, API pública, componentes, dominio, páginas)

### Infraestructura
- **Docker** + **Docker Compose** — Dev + Producción (hardened, non-root)
- **Nginx** — Reverse proxy + WebSocket + rate limiting + OWASP headers
- **Prometheus** — Scraping de métricas + alert rules
- **Grafana** — Dashboards de monitoreo visual + Loki logs
- **Loki** + **Promtail** — Agregación centralizada de logs (7 días retención)

---

## 📚 Conceptos Académicos Demostrados

### Programación Funcional
1. **Funciones puras** — Sin efectos secundarios, mismo input → mismo output
2. **Inmutabilidad** — Datos nunca se mutan, se crean nuevas versiones
3. **Composición** — Pipe operator `|>`, composición de Observables
4. **Pattern Matching** — Desestructuración y matching en Elixir
5. **Higher-Order Functions** — map, filter, reduce, scan
6. **Recursión** — Procesamiento de listas de eventos
7. **Tipos algebraicos** — Union types en TypeScript, atoms en Elixir

### Programación Reactiva
1. **Observable/Observer** — Streams de datos asíncronos
2. **Operadores** — scan, map, filter, merge, combineLatest, shareReplay
3. **Backpressure** — Ventanas deslizantes, throttle
4. **Hot vs Cold Observables** — shareReplay para multicasting
5. **Suscripción/Desuscripción** — useEffect cleanup en hooks
6. **Push-based** — Datos empujados desde el servidor via WebSocket
7. **Composición de streams** — Combinación de múltiples fuentes reactivas

---

## 📄 Licencia

Proyecto académico — Universidad — Noveno Ciclo
Programación Funcional y Reactiva
