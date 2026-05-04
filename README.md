# 🏨 HotelFlux — Sistema de Gestión Hotelera Reactiva

> **Proyecto académico** para la materia de **Programación Funcional y Reactiva** — Noveno Ciclo

[![Elixir](https://img.shields.io/badge/Elixir-1.17+-4B275F.svg?style=flat&logo=elixir)](https://elixir-lang.org)
[![Phoenix](https://img.shields.io/badge/Phoenix-1.7.18-DC5824.svg?style=flat&logo=phoenix)](https://phoenixframework.org)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![RxJS](https://img.shields.io/badge/RxJS-7.8-B7178C.svg?style=flat)](https://rxjs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791.svg?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg?style=flat&logo=docker)](https://www.docker.com)

Sistema completo de gestión hotelera construido con **Elixir/Phoenix** (backend funcional) y **React/RxJS** (frontend reactivo), demostrando patrones avanzados de programación funcional y reactiva en un escenario real.

---

## 📑 Tabla de Contenidos

- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Patrones Demostrados](#-patrones-demostrados)
- [Seguridad](#-seguridad--owasp-top-10--2021--iso-27001)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Inicio Rápido](#-inicio-rápido)
- [Roles y Acceso](#-roles-y-acceso)
- [API Endpoints](#-api-endpoints)
- [Flujo Reactivo en Tiempo Real](#-flujo-reactivo-en-tiempo-real)
- [Saga Pattern](#-saga-pattern--reserva-con-compensación)
- [Página Pública para Clientes](#-página-pública-para-clientes)
- [Analytics Dashboard](#-analytics-dashboard-mejorado)
- [Docker Services](#-docker-services)
- [Tecnologías](#-tecnologías)
- [Conceptos Académicos Demostrados](#-conceptos-académicos-demostrados)
- [Historias de Usuario](#-historias-de-usuario)

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

| Patrón | Implementación | Módulo |
|--------|---------------|--------|
| **Funciones puras** | Entidades del dominio como structs inmutables con funciones de transformación | `domain/habitacion.ex` |
| **Inmutabilidad** | Todos los datos son inmutables por defecto en Elixir; atributos de módulo como constantes | `domain/transitions.ex` |
| **Pattern Matching** | Usado extensivamente en controllers, channels y use cases | `domain/*.ex`, controllers |
| **Pipe Operator** | Composición funcional con `|>` en toda la base de código | `use_cases/*.ex` |
| **Higher-Order Functions** | `Enum.map/2`, `Enum.filter/2`, `Enum.reduce/3`; funciones que aceptan funciones como parámetros | `domain/pipeline.ex` |
| **Recursión con TCO** | Acumulador pattern para tail-call optimization; BFS recursivo para rutas en FSM | `domain/state_machine.ex`, `domain/tree_walker.ex` |
| **Result Monad (ROP)** | Railway Oriented Programming: `{:ok, v}` / `{:error, e}` en pipeline funcional | `domain/result.ex`, `domain/combinators.ex` |
| **Máquina de Estados** | FSM genérica con funciones puras; tablas de transición inmutables como `@module_attribute` | `domain/state_machine.ex`, `domain/transitions.ex` |
| **Event Sourcing** | Reconstrucción de estado con `reconstruir_estado/2` (TCO); proyecciones con HOF reductor | `domain/event_sourcing.ex` |
| **Tree Traversal** | Recursión estructural sobre árbol Hotel→Pisos→Habitaciones con variantes HOF y TCO | `domain/tree_walker.ex` |
| **Puertos (Hexagonal)** | `@behaviour` + `@callback` separados en Input Ports y Output Ports | `ports/input.ex`, `ports/output.ex` |

### Programación Reactiva (Frontend — RxJS + React)

| Patrón | Implementación | Módulo |
|--------|---------------|--------|
| **Observable Streams** | Phoenix Channels → RxJS Observables con `createChannelStream` | `streams/habitacion.stream.ts` |
| **Operador scan/reduce** | Acumulación de estado de habitaciones, tareas de limpieza (`ReadonlyMap` inmutable) | `streams/habitacion.stream.ts` |
| **Backpressure** | `withBackpressure`, `slidingWindow(60)`, `adaptiveThrottle` como operadores HOF | `streams/operators/index.ts` |
| **Hot Observables** | `shareReplay(1)` para multicasting; `asHotWithReplay()` como operador HOF | `streams/operators/index.ts` |
| **Composición de streams** | `combineLatest` de 4 fuentes → `EstadoGlobal` inmutable derivado puramente | `streams/composite/hotel-state.stream.ts` |
| **Bridge Observable→React** | Hook `useObservable` conecta streams RxJS con useState | `hooks/useObservable.ts` |
| **Operadores custom HOF** | 14 operadores como funciones `T → OperatorFunction<T,T>` (retornan funciones) | `streams/operators/index.ts` |
| **Retry exponencial** | `retryWithExponentialBackoff(3, 1000)` — espera 1s, 2s, 4s entre reintentos | `streams/operators/index.ts` |
| **Result<T,E>** | Tipo discriminado + 12 HOF curried: `mapResult`, `flatMapResult`, `sequence`, `traverse` | `domain/result.ts` |
| **Proyecciones derivadas** | `proyectarEstado(selector)` — HOF que produce sub-streams del estado global | `streams/composite/hotel-state.stream.ts` |

### Programación Funcional (Frontend — TypeScript)

| Patrón | Implementación | Módulo |
|--------|---------------|--------|
| **Funciones de Orden Superior** | `pipe`, `compose`, `filtrarPor`, `agruparPor`, `memoize`, `siCondicion` | `domain/higher-order/index.ts` |
| **Currying** | Todas las HOF retornan funciones especializadas: `filtrarPor('categoria')('fruta')` | `domain/higher-order/index.ts` |
| **Composición AND/OR** | `todosLosPredicados`, `algunPredicado`, `negar` — álgebra de predicados | `domain/higher-order/index.ts` |
| **Recursión con TCO** | `aplanarEventos(acc)`, `reconstruirEstado(acc)`, `agruparEnChunks` con acumulador | `domain/pure/recursion.ts` |
| **Tree Traversal TS** | `mapArbol`, `filtrarArbol`, `profundidadArbol` — recursión estructural tipada | `domain/pure/recursion.ts` |
| **Funciones puras** | `calcularPrecioConIGV`, `clasificarHabitacion`, `calcularOcupacion` — deterministas | `domain/pure/index.ts` |
| **Inmutabilidad TS** | `readonly`, `Readonly<T>`, `as const` en todo el dominio | `domain/entidades/*.ts` |

### Patrones de Arquitectura

| Patrón | Ubicación |
|--------|-----------|
| **Arquitectura Hexagonal** | Backend — puertos input/output, adaptadores, dominio desacoplado |
| **Clean Architecture** | Frontend — domain → application → streams → hooks → components → pages |
| **CQRS** | Separación de comandos (escritura) y queries (lectura) en API |
| **Event Sourcing** | Tabla `eventos_dominio`, reconstrucción de estado con `EventSourcing.reconstruir_estado/2` |
| **Saga Pattern** | Reservas con 5 pasos y compensación automática |
| **Observer Pattern** | Phoenix PubSub → Channels → RxJS Subjects |
| **Soft Delete** | Eliminación lógica en las 11 entidades del sistema |
| **Railway Oriented Programming** | `Result<T,E>` en frontend + `{:ok,v}/{:error,e}` en backend para pipelines sin excepciones |
| **State Machine** | FSM genérica (`StateMachine`) + tablas de dominio (`Transitions`) con transiciones puras |
| **Design Tokens** | Sistema de diseño luxury gold/navy como constantes inmutables (`as const`) |

---

## 🔐 Seguridad — OWASP Top 10 (2021) + ISO 27001

### OWASP Top 10 — Mapeo Completo

| # | Riesgo OWASP 2021 | Control Implementado | Implementación | Archivo(s) |
|---|-------------------|---------------------|----------------|------------|
| **A01** | Broken Access Control | RBAC + JWT + Role Guards | Guardian pipeline con `AuthPlug` + `RolePlug`, `RoleGuard` en frontend, `rutasPermitidas` por rol | `router.ex`, `App.tsx`, `auth_plug.ex` |
| **A02** | Cryptographic Failures | Bcrypt 12R + HTTPS + Secure Cookies | Bcrypt con 12 rounds (prod), cookies `Secure; SameSite=Strict; HttpOnly`, token blacklist en Redis, HSTS 1 año | `auth_controller.ex`, `endpoint.ex` |
| **A03** | Injection | Input Sanitization Plug + Ecto Parameterized | Regex contra 9 patrones peligrosos (XSS, SQLi, Command Injection), límite 10K chars/campo, Ecto parameterized queries | `input_sanitization_plug.ex`, `*_repo.ex` |
| **A04** | Insecure Design | Rate Limiting + Account Lockout | Redis sliding window: Auth 10/min, API pública 30/min, global 120/min. Lockout 5 intentos → 30 min bloqueo | `rate_limit_plug.ex`, `auth_controller.ex` |
| **A05** | Security Misconfiguration | Security Headers Plug | CSP Level 3, HSTS 31536000s, X-Frame-Options DENY, X-Content-Type-Options, COEP/COOP/CORP, Permissions-Policy (camera, microphone, geolocation bloqueados) | `security_headers_plug.ex`, `endpoint.ex` |
| **A06** | Vulnerable Components | Dependencias pinned + Alpine minimal | Elixir deps en `mix.lock`, npm `package-lock.json`, imágenes Alpine minimal, Docker multi-stage sin dev deps en runtime | `Dockerfile`, `mix.lock`, `package-lock.json` |
| **A07** | Identification & Auth Failures | NIST 800-63B Passwords + JWT HTTP-only | Password: 8+ chars, mayúscula, minúscula, número, especial, no contiene email. JWT en cookies HTTP-only. Remember Me: 7d/12h TTL configurable | `auth_controller.ex`, `security.ts` |
| **A08** | Software & Data Integrity | Soft Delete + Event Sourcing | Eliminación lógica en 11 entidades, tabla `eventos_dominio` con registro inmutable de cambios, Saga con compensación automática | `domain/*.ex`, `events.ex` |
| **A09** | Security Logging & Monitoring | Audit Log Plug + Loki + Alertas | ISO 27001 A.12.4 structured logging: método, path, status, IP, user_id, duración. Alertas en respuestas >2s y accesos 401/403. Loki + Grafana dashboards | `audit_log_plug.ex`, `loki-config.yml` |
| **A10** | Server-Side Request Forgery | API endpoints validados + no user-controlled URLs | Endpoints REST estrictos, no hay funcionalidad de proxying, inputs sanitizados contra patrones de URL injection | `input_sanitization_plug.ex`, `router.ex` |

### Flujo de Seguridad — Request Pipeline

```
Request HTTP
    │
    ▼
[1] RequestId (Telemetry)           ← Trazabilidad
    │
    ▼
[2] SecurityHeadersPlug             ← A05: CSP, HSTS, X-Frame-Options, COEP/COOP
    │
    ▼
[3] AuditLogPlug                    ← A09: Logging ISO 27001 A.12.4
    │
    ▼
[4] Body Parser (8MB limit)         ← A04: Protección contra payload excesivo
    │
    ▼
[5] CORS (origins explícitos)       ← A05: Only allowed origins
    │
    ▼
[6] InputSanitizationPlug           ← A03: XSS, SQLi, Command Injection filter
    │
    ▼
[7] RateLimitPlug (por pipeline)    ← A04: Redis sliding window per IP
    │
    ▼
[8] AuthPlug + RolePlug             ← A01+A07: JWT + RBAC verification
    │
    ▼
[9] Controller / Business Logic
```

### ISO 27001 — Controles Implementados (Annex A)

| Anexo | Control | Estado | Implementación |
|-------|---------|--------|----------------|
| **A.5.1** | Políticas de seguridad | ✅ 100% | Políticas definidas en plugs, password policy NIST, rate limits documentados |
| **A.8.1** | Inventario de activos | ✅ 100% | Docker images versionadas, dependencias en lockfiles, OCI labels |
| **A.9.1** | Política de control de acceso | ✅ 100% | RBAC 4 roles (admin, recepcionista, limpieza, mantenimiento), guards frontend+backend |
| **A.9.2** | Gestión de acceso de usuarios | ✅ 100% | Registro con validación, soft delete (nunca eliminar), admin gestiona personal |
| **A.9.3** | Responsabilidades del usuario | ✅ 100% | Password NIST 800-63B, lockout 5 intentos, sesión expirable (12h/7d) |
| **A.9.4** | Control de acceso al sistema | ✅ 100% | JWT HTTP-only cookies, token blacklist Redis, remember me configurable |
| **A.10.1** | Controles criptográficos | ✅ 100% | Bcrypt 12 rounds, HTTPS enforced (HSTS), cookies Secure+SameSite |
| **A.12.1** | Procedimientos operacionales | ✅ 95% | Docker Compose prod/dev, Makefile, scripts de migración, healthchecks |
| **A.12.4** | Logging y monitoreo | ✅ 95% | AuditLogPlug structured → Loki, Prometheus alertas, Grafana dashboards |
| **A.12.6** | Gestión de vulnerabilidades | ✅ 90% | OWASP Top 10 cubierto, dependencias pinned, Alpine minimal images |
| **A.13.1** | Gestión de seguridad de red | ✅ 90% | Nginx reverse proxy, rate limiting multi-capa, CORS restrictivo |
| **A.14.1** | Requisitos de seguridad | ✅ 100% | Validación en sistema boundary (plugs), sanitización de input, typed APIs |
| **A.14.2** | Desarrollo seguro | ✅ 95% | Hexagonal Architecture, tests ExUnit+Vitest, non-root containers, multi-stage builds |
| **A.18.1** | Cumplimiento legal | ✅ 100% | Ley N° 29733 (Perú), ARCO rights, Libro de Reclamaciones, Política cookies |

### Frontend — Seguridad (`security.ts`)

| Utilidad | Propósito |
|----------|-----------|
| `sanitizeHtml()` | Escape de entidades HTML contra XSS (A03) |
| `validatePassword()` | Validación NIST 800-63B con score/errores/fuerza (A07) |
| `getPasswordStrengthColor()` | UI feedback para fortaleza de contraseña |
| `isValidEmail()` | Validación de formato email |
| `generateNonce()` | Generación de nonce para CSP (A05) |
| `securityLog()` | Logging de eventos de seguridad en desarrollo (A09) |
| `checkRateLimit()` | Rate limiter en memoria por clave — capa defensiva frontend (A04) |
| `getRateLimitRemaining()` | Consultar intentos restantes del rate limiter |
| `generateCsrfToken()` | Token CSRF único (32 bytes hex) para formularios (A05) |
| `sanitizeUrl()` | Bloquea esquemas peligrosos: `javascript:`, `data:`, `vbscript:` (A03) |
| `sanitizeDocumento()` | Sanitiza documentos de identidad (solo alfanuméricos y guiones) |
| `isValidPhone()` | Validación de formato telefónico peruano/internacional |
| `buildCspDirectives()` | Genera directivas CSP Level 3 con nonce (A05) |

---

## 🗂️ Estructura del Proyecto

```
funcionalreactiva/
├── backend/                              # Elixir/Phoenix API
│   ├── lib/hotelflux/
│   │   ├── domain/                       # Lógica de negocio pura (sin efectos)
│   │   │   ├── habitacion.ex             # Entidad + FSM + soft delete
│   │   │   ├── reserva.ex               # Entidad + soft delete
│   │   │   ├── huesped.ex               # Entidad + soft delete
│   │   │   ├── producto.ex              # Entidad + soft delete
│   │   │   ├── usuario.ex               # Entidad + OWASP passwords
│   │   │   ├── piso.ex                  # Gestión de pisos
│   │   │   ├── turno.ex                 # Turnos laborales
│   │   │   ├── horario_personal.ex      # Horarios/asistencia
│   │   │   ├── tarea_limpieza.ex        # Entidad + soft delete
│   │   │   ├── consumo.ex               # Entidad + soft delete
│   │   │   ├── pago.ex                  # Entidad + soft delete
│   │   │   ├── events.ex                # Eventos de dominio (Event Sourcing)
│   │   │   ├── pipeline.ex              # HOF: compose, pipe, memoize, TCO
│   │   │   ├── result.ex                # Result monad — Railway Oriented Programming
│   │   │   ├── combinators.ex           # ROP combinators: map_ok, flat_map_ok, validate_with
│   │   │   ├── state_machine.ex         # FSM genérico: transicion/3, existe_ruta?/3 (BFS)
│   │   │   ├── transitions.ex           # Tablas FSM de dominio (as module attributes)
│   │   │   ├── event_sourcing.ex        # reconstruir_estado/2 TCO, proyectar/3 HOF
│   │   │   └── tree_walker.ex           # Tree traversal recursivo + TCO para pisos/habitaciones
│   │   ├── ports/
│   │   │   ├── input.ex                 # Behaviours de entrada (casos de uso)
│   │   │   └── output.ex                # Behaviours de salida (repos, servicios)
│   │   ├── use_cases/                   # Casos de uso + Saga
│   │   ├── workers/                     # Oban background jobs
│   │   │   ├── email_worker.ex          # Emails con reintentos
│   │   │   └── limpieza_timeout_worker.ex # Alerta limpieza 45min
│   │   ├── adapters/
│   │   │   ├── repos/                   # 10 repositorios con soft delete
│   │   │   └── cache/
│   │   │       └── redis_cache.ex       # Cache + Rate Limit + Blacklist
│   │   └── auth/                        # JWT Guardian pipeline
│   ├── lib/hotelflux_web/
│   │   ├── controllers/
│   │   │   ├── auth_controller.ex       # OWASP + HTTP-only cookies
│   │   │   ├── admin_controller.ex      # CRUD completo
│   │   │   ├── habitacion_controller.ex
│   │   │   ├── reserva_controller.ex
│   │   │   ├── query_controller.ex
│   │   │   └── publico_controller.ex    # Endpoints públicos (clientes)
│   │   ├── channels/                    # Phoenix Channels (WebSocket)
│   │   └── router.ex
│   ├── priv/repo/
│   │   ├── migrations/                  # 9 migraciones + soft delete
│   │   └── seeds.exs
│   ├── test/
│   │   ├── domain/
│   │   │   ├── state_machine_test.exs   # Tests FSM + BFS recursivo
│   │   │   ├── result_test.exs          # Tests ROP + monad laws
│   │   │   └── tree_walker_test.exs     # Tests tree traversal + TCO
│   │   ├── adapters/
│   │   └── channels/
│   └── config/
│
├── frontend-reception/                   # React 19 + TypeScript + RxJS SPA
│   ├── src/
│   │   ├── design-tokens.ts             # Sistema de diseño (as const) — colores, tipografía, spacing
│   │   ├── domain/
│   │   │   ├── types.ts                 # Re-export centralizado de entidades
│   │   │   ├── result.ts                # Result<T,E> monad — ROP en TypeScript
│   │   │   ├── entidades/               # 9 archivos de entidad (readonly interfaces)
│   │   │   │   ├── habitacion.ts        # + CLASE_ESTADO Tailwind v4 + funciones puras
│   │   │   │   ├── reserva.ts
│   │   │   │   ├── huesped.ts
│   │   │   │   └── ...
│   │   │   ├── higher-order/
│   │   │   │   └── index.ts             # HOF: pipe, compose, filtrarPor, memoize, negar, tap
│   │   │   └── pure/
│   │   │       ├── index.ts             # Funciones puras: precios, ocupación, filtros (curried)
│   │   │       └── recursion.ts         # Algoritmos recursivos + TCO: aplanar, recorrer, reconstruir
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   └── index.ts             # Interfaces Clean Architecture (IHabitacionRepository, etc.)
│   │   │   └── use-cases/
│   │   │       └── index.ts             # Casos de uso HOF con inyección funcional
│   │   ├── streams/                     # RxJS Observable Streams
│   │   │   ├── habitacion.stream.ts     # acumularHabitaciones + ordenarHabitaciones (HOF)
│   │   │   ├── combined.stream.ts       # combineLatest + withAutoRetry operator
│   │   │   ├── operators/
│   │   │   │   └── index.ts             # 14 operadores RxJS custom (HOF): backpressure, retry, scan
│   │   │   └── composite/
│   │   │       └── hotel-state.stream.ts # Estado global compuesto: 4 streams → EstadoGlobal
│   │   ├── hooks/                       # Bridge Observable → React (useHabitacionStream, etc.)
│   │   ├── services/
│   │   │   ├── api.ts                   # CQRS client + offline fallback
│   │   │   ├── admin.api.ts             # API admin tipada
│   │   │   └── publico.api.ts           # API pública para clientes
│   │   ├── components/
│   │   │   ├── shared/
│   │   │   │   ├── Layout.tsx           # Nav admin
│   │   │   │   ├── ClienteLayout.tsx    # Navbar scroll + footer + Cookie Consent
│   │   │   │   ├── CookieConsent.tsx    # Banner consentimiento (Ley 29733)
│   │   │   │   └── Icons.tsx
│   │   │   ├── habitaciones/            # Mapa SVG, cards (CLASE_ESTADO), leyenda
│   │   │   ├── dashboard/               # KPIs, gráficas Recharts
│   │   │   ├── reservas/                # Form, lista, Saga progress
│   │   │   ├── productos/               # Catálogo, modal venta
│   │   │   ├── limpieza/                # Tareas mobile-first
│   │   │   └── notificaciones/          # Panel de alertas
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx        # KPIs + acciones rápidas por rol
│   │   │   ├── RecepcionPage.tsx        # Mapa interactivo + reserva directa
│   │   │   ├── PersonalPage.tsx
│   │   │   ├── AnaliticaPage.tsx
│   │   │   ├── AuditoriaPage.tsx
│   │   │   └── ...
│   │   ├── test/
│   │   │   └── unit/
│   │   │       ├── result.test.ts        # Tests Result monad + ROP
│   │   │       ├── higher-order.test.ts  # Tests HOF: pipe, compose, filtrarPor, memoize
│   │   │       └── pure.test.ts          # Tests funciones puras + inmutabilidad
│   │   ├── App.tsx
│   │   └── index.css                    # Tailwind v4 + @theme (colores estado, luxury)
│   └── vite.config.ts                   # Vitest config
│
├── nginx/nginx.conf                     # Reverse proxy + rate limiting
├── infra/                               # Monitoreo + Observabilidad
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   └── alert_rules.yml
│   ├── loki/
│   │   ├── loki-config.yml
│   │   └── promtail-config.yml
│   └── grafana/
│       └── dashboards/hotelflux-main.json
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
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
| **admin** | Dashboard | Todas las secciones + **Personal** + **Analítica** + **Auditoría** + Configuración |
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

El sistema incluye una experiencia completa para huéspedes sin necesidad de autenticación:

- **Landing page premium** — Hero full-viewport, galería de habitaciones, servicios, testimonios, CTA
- **Búsqueda de disponibilidad** por rango de fechas, tipo de habitación y capacidad
- **Reserva en línea** con flujo de 4 pasos (busqueda → selección → datos → confirmación)
- **Código de confirmación** único (HF-XXXXXXXX) con detalle completo
- **Catálogo de servicios** agrupados por categoría (Room Service, Spa, WiFi, Tours, etc.)
- **Moneda peruana** (S/ — Soles) con IGV 18% incluido
- **Diseño luxury unificado** — Paleta navy #0c1d3d + gold #c5a255 en toda la experiencia
- **Cookie consent banner** — Consentimiento granular (esenciales/funcionales/analíticas)
- **Documentos legales premium** — Accordion interactivo con tabla de contenidos

### Cumplimiento Legal — Perú 🇵🇪

| Documento | Contenido | UX |
|-----------|-----------|-----|
| **Política de Privacidad** | Ley N° 29733 (Protección de Datos Personales), derechos ARCO, autoridad ANPDP, medidas técnicas OWASP | Accordion expandible, tabla de contenidos, badge de marco legal |
| **Términos y Condiciones** | Código de Protección al Consumidor (Ley 29571), Libro de Reclamaciones, IGV 18%, check-in/check-out, cancelación | 10 secciones detalladas con política de cancelación completa |
| **Política de Cookies** | Categorías de cookies (esenciales/funcionales/analíticas), HttpOnly, Secure, SameSite, gestión por navegador | 7 secciones con tabla de cookies, configuración de seguridad OWASP |
| **Cookie Consent Banner** | Consentimiento granular con toggles por categoría, versión controlada, persistencia en localStorage | Banner animado, 3 opciones rápidas, configuración detallada |

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

### Programación Funcional — Backend (Elixir)

| Concepto | Descripción | Implementación |
|----------|-------------|----------------|
| **Funciones puras** | Sin efectos secundarios, mismo input → mismo output | `domain/habitacion.ex`, `domain/result.ex`, `domain/combinators.ex` |
| **Inmutabilidad** | Datos como module attributes (`@atributo`), structs no mutados | `domain/transitions.ex` (`@habitacion_fsm` immutable) |
| **Pattern Matching** | Desestructuración, guards, cláusulas de función | Todo el dominio Elixir |
| **Higher-Order Functions** | Funciones que reciben/retornan funciones | `domain/pipeline.ex` (`compose`, `parcial`, `memoize`) |
| **Recursión TCO** | Tail-Call Optimization con `reduce` acumulador | `domain/tree_walker.ex`, `domain/event_sourcing.ex` |
| **Result Monad (ROP)** | Railway Oriented Programming — manejo funcional de errores | `domain/result.ex`, `domain/combinators.ex` |
| **State Machine (FSM)** | Máquina de estados finita genérica y pura | `domain/state_machine.ex` (BFS recursivo para `existe_ruta?/3`) |
| **Event Sourcing** | Estado = proyección de eventos históricos | `domain/event_sourcing.ex` (`reconstruir_estado/2`) |
| **Tree Traversal** | Recursión sobre árboles (pisos → habitaciones) | `domain/tree_walker.ex` |
| **Tipos Algebraicos** | Union types y structs como ADTs | `domain/result.ex` (`{:ok, v} \| {:error, e}`) |
| **Ports & Adapters** | Interfaces como behaviours (Clean Architecture) | `ports/input.ex`, `ports/output.ex` |

### Programación Reactiva — Frontend (RxJS)

| Concepto | Descripción | Implementación |
|----------|-------------|----------------|
| **Observable / Observer** | Streams de datos asíncronos tipados | Todos los archivos `*.stream.ts` |
| **Operadores custom (HOF)** | Operadores RxJS propios como funciones de orden superior | `streams/operators/index.ts` (14 operadores) |
| **Backpressure** | Control de flujo: ventanas deslizantes, throttle adaptativo | `withBackpressure`, `adaptiveThrottle`, `slidingWindow` |
| **Hot vs Cold** | `shareReplay` para multicasting a múltiples suscriptores | `asHotWithReplay` en `streams/operators/index.ts` |
| **Retry Exponencial** | Reintentos con backoff exponencial (jitter incluido) | `retryWithExponentialBackoff` |
| **Composición de streams** | `combineLatest` de 4 fuentes → estado global | `streams/composite/hotel-state.stream.ts` |
| **scan como estado** | Acumulación de estado inmutable en el tiempo | `acumularHabitaciones()` en `habitacion.stream.ts` |
| **Cleanup automático** | `takeUntil`, `unsubscribe` en cleanup de hooks | `useHabitacionStream`, `useDashboardStream` |
| **Throttle/Debounce** | Operadores de rate-limiting reactivos | `withDebounce`, `throttleTime` |
| **Push-based** | Datos empujados desde servidor via WebSocket | `Phoenix.Channel` → `BehaviorSubject` → `combineLatest` |

### Programación Funcional — Frontend (TypeScript)

| Concepto | Descripción | Implementación |
|----------|-------------|----------------|
| **pipe (data-first)** | Composición izquierda-derecha con valor inicial | `domain/higher-order/index.ts` (`pipe(valor, f1, f2, f3)`) |
| **compose (f ∘ g)** | Composición derecha-izquierda matemática | `domain/higher-order/index.ts` |
| **Currying** | Aplicación parcial de 2-3 niveles | `filtrarPor(prop)(val)(lista)`, `ordenarPor(prop)(dir)(a, b)` |
| **Result Monad** | `ok/err`, `mapResult`, `flatMapResult`, `fold` (ROP) | `domain/result.ts` |
| **Inmutabilidad** | `readonly`, `as const`, `ReadonlyMap`, spread operators | Todos los tipos y funciones del dominio |
| **Recursión (TCO)** | Funciones tail-recursive con acumuladores | `domain/pure/recursion.ts` |
| **HOF predicados** | `todosLosPredicados([...])`, `algunPredicado([...])`, `negar` | `domain/higher-order/index.ts` |
| **Design Tokens** | Sistema de diseño como constantes tipadas (`as const`) | `design-tokens.ts` |
| **Clean Architecture** | Puertos como interfaces, casos de uso como HOF | `application/ports/index.ts`, `application/use-cases/index.ts` |

---

## 📄 Licencia

> 📋 Proyecto académico — Universidad — Noveno Ciclo  
> Programación Funcional y Reactiva

---

## 📋 Tabla de Contenidos (detallada)

### HU-01: Autenticación Segura
**Como** empleado del hotel, **quiero** iniciar sesión con mis credenciales, **para** acceder al sistema según mi rol.
- **Criterios:** Login con email/password, JWT en cookie HTTP-only, remember me (7d), lockout tras 5 intentos fallidos, password NIST 800-63B.

### HU-02: Gestión de Recepción en Tiempo Real
**Como** recepcionista, **quiero** ver el mapa de habitaciones actualizado en tiempo real, **para** gestionar check-ins, check-outs y reservas al instante.
- **Criterios:** Mapa por pisos con SVG, colores por estado, WebSocket push, panel de detalle lateral, modal de reserva directa con 3 pasos.

### HU-03: Crear Reserva con Saga Pattern
**Como** recepcionista, **quiero** crear una reserva que pase por validación → bloqueo → persistencia → pago → notificación, **para** garantizar consistencia transaccional.
- **Criterios:** 5 pasos Saga, compensación automática ante fallo, progress bar en UI, evento de dominio registrado.

### HU-04: Dashboard de Métricas
**Como** administrador, **quiero** ver KPIs en tiempo real (ocupación, ingresos, reservas, limpieza), **para** tomar decisiones operacionales informadas.
- **Criterios:** Métricas con polling reactivo (RxJS scan), gráficas Recharts, caché Redis 30s, exportación CSV.

### HU-05: Gestión de Limpieza Mobile-First
**Como** personal de limpieza, **quiero** ver mis tareas asignadas desde mi móvil, **para** completarlas y reportar incidencias.
- **Criterios:** Vista mobile-first, lista de tareas filtrables, cambio de estado con un tap, timeout de 45 min con alerta Oban.

### HU-06: Auditoría y Seguridad (ISO 27001)
**Como** administrador, **quiero** ver un historial completo de actividad del sistema, **para** cumplir con los controles de logging ISO 27001 A.12.4.
- **Criterios:** Timeline de eventos, filtros por severidad/tipo, contadores KPI, panel OWASP, compliance ISO 27001. Ruta: `/admin/auditoria`.

### HU-07: Reserva Pública para Huéspedes
**Como** huésped potencial, **quiero** buscar disponibilidad y reservar una habitación sin crear cuenta, **para** hacer una reserva rápida en línea.
- **Criterios:** Búsqueda por fechas/tipo/capacidad, precios en Soles (S/), código de confirmación, consulta de estado.

### HU-08: Analítica Avanzada
**Como** administrador, **quiero** ver gráficas de ingresos, reservas, productos populares y ocupación por tipo, **para** optimizar la operación del hotel.
- **Criterios:** Períodos configurables (día→año), granularidad temporal, ocupación por tipo, ranking de habitaciones, ingresos por habitación.

### HU-09: Gestión de Personal
**Como** administrador, **quiero** registrar empleados, asignar turnos y controlar horarios/asistencia, **para** gestionar el recurso humano del hotel.
- **Criterios:** CRUD de personal con soft delete, turnos, horarios semanales, control de asistencia, conteo por rol.

### HU-10: Layout Responsivo con Navegación por Rol
**Como** empleado, **quiero** un panel con sidebar dinámico que muestre solo mis secciones permitidas y funcione en móvil, **para** navegar eficientemente desde cualquier dispositivo.
- **Criterios:** Sidebar filtrado por rol (RBAC), hamburger menu en móvil, breadcrumbs contextuales, overlay con backdrop blur.

### HU-11: Consentimiento de Cookies (Ley N° 29733)
**Como** visitante del sitio web, **quiero** poder gestionar mis preferencias de cookies con un banner claro, **para** ejercer mi derecho de consentimiento informado conforme a la Ley N° 29733.
- **Criterios:** Banner con 3 categorías (esenciales siempre activas, funcionales, analíticas), toggles por categoría, opciones "Aceptar todas" / "Solo esenciales" / "Guardar preferencias", persistencia en localStorage, link a política completa, versión controlada (invalidación automática al cambiar).

### HU-12: Documentación Legal Premium
**Como** huésped potencial, **quiero** acceder a la política de privacidad, términos y condiciones, y política de cookies en un formato profesional y fácil de navegar, **para** conocer mis derechos antes de reservar.
- **Criterios:** 3 documentos legales con tabs de navegación, secciones accordion expandibles/colapsibles, tabla de contenidos interactiva, badge de marco legal vigente (Ley 29733), diseño premium con branding luxury, botones "expandir/contraer todo", card de contacto del Oficial de Protección de Datos.

### HU-13: Página de Inicio Luxury (Branding Hotelero)
**Como** visitante del sitio web, **quiero** ver una landing page profesional que transmita la experiencia luxury del hotel, **para** motivarme a realizar una reserva.
- **Criterios:** Hero full-viewport con fondo navy, texto gradient dorado, badge "Bienvenido a HotelFlux", trust signals (pago seguro, cancelación 48h, WiFi, parking), panel de estadísticas glassmorphism, galería de habitaciones con precios en S/, sección de servicios premium, testimonios con ratings de estrellas, CTA final con teléfono directo, animaciones de aparición al scroll (IntersectionObserver).

### HU-14: Login de Empleados con Protección Anti-Fuerza Bruta
**Como** empleado del hotel, **quiero** un login que me proteja contra ataques de fuerza bruta y que sea visualmente premium, **para** acceder de forma segura y cómoda.
- **Criterios:** Bloqueo tras 5 intentos fallidos (30s cooldown con barra de progreso visual), toggle de visibilidad de contraseña, checkbox "Recordar sesión" (7 días vs 12h), 4 botones de acceso rápido (demo), security badges (OWASP, ISO 27001, NIST), logging de eventos de seguridad, tema gold/navy consistente.

### HU-15: Reserva Pública con Tema Luxury Unificado
**Como** huésped potencial, **quiero** que el proceso de reserva mantenga el mismo diseño luxury gold/navy del sitio, **para** tener una experiencia visual coherente durante toda mi interacción.
- **Criterios:** Stepper con colores navy/gold (no azul genérico), cards de habitación con efecto luxury-card hover, resumen de reserva en panel navy, focus rings dorados en formularios, testimonios integrados en la búsqueda, badge de precio en S/ (Soles), confirmación con código HF-XXXXXXXX.

### HU-16: Seguridad Frontend OWASP Completa
**Como** desarrollador del sistema, **quiero** utilidades de seguridad frontend que cubran los principales vectores de ataque OWASP, **para** implementar defensa en profundidad.
- **Criterios:** Sanitización HTML (A03), validación de URL contra schemes peligrosos (A03), rate limiter en memoria (A04), generación de tokens CSRF (A05), directivas CSP con nonce (A05), validación NIST 800-63B de contraseñas (A07), logging de seguridad (A09), sanitización de documentos de identidad, validación de teléfono.
