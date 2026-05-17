# 🏛️ HotelFlux — Arquitectura Detallada

> Documentación arquitectónica del sistema de gestión hotelera reactiva.
> Complementa [README.md](./README.md) con diagramas, decisiones de diseño y patrones de comunicación.

---

## Tabla de Contenidos

1. [Filosofía de Arquitectura](#-filosofía-de-arquitectura)
2. [Arquitectura Hexagonal — Backend](#-arquitectura-hexagonal--backend)
3. [Clean Architecture — Frontend](#-clean-architecture--frontend)
4. [Comunicación entre Capas](#-comunicación-entre-capas)
5. [Flujo de Datos Reactivo](#-flujo-de-datos-reactivo)
6. [Eventos de Dominio y Event Sourcing](#-eventos-de-dominio-y-event-sourcing)
7. [Seguridad — Arquitectura de Plugs](#-arquitectura-de-seguridad)
8. [Infraestructura y Observabilidad](#-infraestructura-y-observabilidad)
9. [Decisiones de Diseño (ADR)](#-decisiones-de-diseño-adr)
10. [Guía de Extensión](#-guía-de-extensión)
11. [Análisis de Testing por Arquitectura](#-análisis-de-testing-por-arquitectura)
12. [Métricas de Calidad de Arquitectura](#-métricas-de-calidad-de-arquitectura)

---

## 🧭 Filosofía de Arquitectura

### Principios fundamentales

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        ARQUITECTURA HOTELFLUX                                  ║
║                                                                                ║
║   PRINCIPIO 1: EL DOMINIO NO CONOCE NADA                                       ║
║   ─────────────────────────────────────────────────                            ║
║   El dominio (lógica de negocio) NO depende de:                                ║
║     • Base de datos (PostgreSQL)                                               ║
║     • Frameworks web (Phoenix)                                                 ║
║     • Frameworks de testing                                                    ║
║     • Frameworks de UI (React)                                                 ║
║                                                                                ║
║   El dominio SOLO conoce:                                                       ║
║     • Sus entidades (structs inmutables)                                       ║
║     • Sus reglas de negocio (funciones puras)                                  ║
║     • Sus puertos (behaviours/interfaces)                                      ║
║                                                                                ║
║   PRINCIPIO 2: LAS DEPENDENCIAS APUNTAN HACIA AFUERA                           ║
║   ─────────────────────────────────────────────────                            ║
║                                                                                ║
║            UI / Controllers                                                     ║
║                  │                                                              ║
║                  ▼                                                              ║
║            Use Cases / Services                                                 ║
║                  │                                                              ║
║                  ▼                                                              ║
║            Domain (INMUTABLE, SIN DEPENDENCIAS)                                ║
║                  │                                                              ║
║                  ▼                                                              ║
║            Ports (interfaces sin implementación)                                ║
║                  ▲                                                              ║
║                  │                                                              ║
║            Adapters (implementaciones concretas)                                ║
║                  │                                                              ║
║                  ▼                                                              ║
║            Infraestructura (PostgreSQL, Redis, etc.)                            ║
║                                                                                ║
║   PRINCIPIO 3: CADA CAPA TIENE UNA RESPONSABILIDAD ÚNICA                       ║
║   ─────────────────────────────────────────────────                            ║
║                                                                                ║
║   Dominio    → "QUÉ" (reglas de negocio, qué es válido, qué no)                 ║
║   Use Cases  → "CÓMO" (orquestación, qué pasos para cumplir un caso de uso)    ║
║   Adapters   → "CON QUÉ" (implementación concreta: PostgreSQL, Redis, etc.)    ║
║   Controllers → "CUÁNDO" (HTTP, timing, autenticación, validación de entrada) ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Stack de arquitectura

| Capa | Backend | Frontend |
|---|---|---|
| **UI** | — | React 19 + Tailwind v4 |
| **Presentation** | Phoenix Controllers + Channels | Pages + Components |
| **Application** | Use Cases + Saga | Hooks + Streams |
| **Domain** | Entidades + FSM + ROP | Entidades + Result Monad + HOF |
| **Infrastructure** | Adapters: Repo, Cache, Email | API clients + Repositories |

---

## 🏛️ Arquitectura Hexagonal — Backend

### Vista general de capas

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND — ELIXIR/PHOENIX                                │
│                                                                                 │
│  ╔════════════════════════════════════════════════════════════════════════════╗ │
│  ║  WEB LAYER  (hotelflux_web/)                                               ║ │
│  ║  ─────────────────────────────────────────────────────────────────────────║ │
│  ║  Router.ex ───► Plugs (9) ───► Controllers (13) ───► Channels (4)         ║ │
│  ║       │              │                  │                    │              ║ │
│  ║       │              │                  │                    │              ║ │
│  ║       │              │                  │                    │              ║ │
│  ╚───────┼──────────────┼──────────────────┼────────────────────┼──────────────╝ │
│          │              │                  │                    │                │
│          ▼              ▼                  ▼                    ▼                │
│  ╔════════════════════════════════════════════════════════════════════════════╗ │
│  ║  USE CASES  (use_cases/)                                                   ║ │
│  ║  ─────────────────────────────────────────────────────────────────────────║ │
│  ║  checkin_use_case.ex          │  venta_producto_use_case.ex                ║ │
│  ║  checkout_use_case.ex         │  asignar_limpieza_use_case.ex             ║ │
│  ║  saga/reserva_saga.ex         │                                           ║ │
│  ║       │                       │                                           ║ │
│  ║       │  Recibe params, llama │ a puertos de entrada (contracts),          ║ │
│  ║       │  orchestra operaciones│ , devuelve {:ok, _} o {:error, _}          ║ │
│  ╚───────┼────────────────────────────────────────────────────────────────────╝ │
│          │                                                                     │
│          ▼                                                                     │
│  ╔════════════════════════════════════════════════════════════════════════════╗ │
│  ║  PORTS  (ports/)                                                            ║ │
│  ║  ─────────────────────────────────────────────────────────────────────────║ │
│  ║  input.ex (behaviours de entrada):                                        ║ │
│  ║    • HabitacionPort, ReservaPort, PagoPort, NotificacionPort               ║ │
│  ║                                                                            ║ │
│  ║  output.ex (behaviours de salida):                                         ║ │
│  ║    • HabitacionRepository (callbacks: obtener, listar, crear, actualizar,   ║ │
│  ║                                    cambiar_estado, buscar_disponibles,     ║ │
│  ║                                    contar_por_estado, soft_delete)         ║ │
│  ║    • ReservaRepository, HuespedRepository, ProductoRepository              ║ │
│  ║    • CacheService (get, set, delete, increment, exists?)                   ║ │
│  ║    • EventRepository (registrar, obtener_por_entidad, obtener_recientes)    ║ │
│  ║    • ObservableRepository (topic_cambios, broadcast_cambio, suscribir)     ║ │
│  ╚───────┼────────────────────────────────────────────────────────────────────╝ │
│          │                                                                     │
│          ▼                                                                     │
│  ╔════════════════════════════════════════════════════════════════════════════╗ │
│  ║  DOMAIN  (domain/)                                                          ║ │
│  ║  ─────────────────────────────────────────────────────────────────────────║ │
│  ║                                                                            ║ │
│  ║  ENTIDADES (11 entidades — structs inmutables):                             ║ │
│  ║  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   ║ │
│  ║  │ Habitacion │  │ Reserva  │  │ Huesped  │  │ Producto │  │ Usuario  │   ║ │
│  ║  │ + FSM      │  │ + Saga   │  │          │  │          │  │ + OWASP  │   ║ │
│  ║  │ + ES       │  │          │  │          │  │          │  │          │   ║ │
│  ║  └────────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   ║ │
│  ║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   ║ │
│  ║  │   Piso    │  │  Turno   │  │Horario   │  │  Tarea   │  │   Pago   │   ║ │
│  ║  │           │  │          │  │Personal  │  │Limpieza  │  │          │   ║ │
│  ║  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   ║ │
│  ║                                ┌──────────┐                                 ║ │
│  ║                                │ Consumo  │                                 ║ │
│  ║                                └──────────┘                                 ║ │
│  ║                                                                            ║ │
│  ║  MÓDULOS FUNCIONALES:                                                       ║ │
│  ║  ┌────────────────────┐  ┌──────────────────┐  ┌─────────────────────┐   ║ │
│  ║  │  state_machine.ex  │  │   event_sourcing  │  │   tree_walker.ex    │   ║ │
│  ║  │  • transicion/3    │  │  • reconstruir/2  │  │  • pre_order/2      │   ║ │
│  ║  │  • existe_ruta?/3  │  │  • proyectar/3    │  │  • in_order/2       │   ║ │
│  ║  │  (BFS recursivo)  │  │  (TCO + HOF)      │  │  • level_order/2    │   ║ │
│  ║  └────────────────────┘  └──────────────────┘  └─────────────────────┘   ║ │
│  ║  ┌────────────────────┐  ┌──────────────────┐  ┌─────────────────────┐   ║ │
│  ║  │   result.ex         │  │  combinators.ex   │  │   pipeline.ex        │   ║ │
│  ║  │  • ok/1, err/1      │  │  • map_ok/2       │  │  • compose/1         │   ║ │
│  ║  │  • map/2, flat_map/2│  │  • flat_map_ok/2  │  │  • pipe/2            │   ║ │
│  ║  │  • fold/3 (ROP)     │  │  • validate_with/3│  │  • memoize/1         │   ║ │
│  ║  └────────────────────┘  └──────────────────┘  └─────────────────────┘   ║ │
│  ╚════════════════════════════════════════════════════════════════════════════╝ │
│          ▲                                                                     │
│          │                                                                     │
│          ▼                                                                     │
│  ╔════════════════════════════════════════════════════════════════════════════╗ │
│  ║  ADAPTERS  (adapters/)                                                      ║ │
│  ║  ─────────────────────────────────────────────────────────────────────────║ │
│  ║                                                                            ║ │
│  ║  repos/ (implementaciones de ports/output.ex):                            ║ │
│  ║  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   ║ │
│  ║  │Habitacion  │  │ Reserva  │  │ Huesped  │  │Producto  │  │Usuario   │   ║ │
│  ║  │Repo        │  │Repo      │  │Repo      │  │Repo      │  │Repo      │   ║ │
│  ║  │+ broadcast │  │+ Saga    │  │          │  │          │  │+ bcrypt  │   ║ │
│  ║  └────────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   ║ │
│  ║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   ║ │
│  ║  │  Piso    │  │  Turno   │  │ Horario  │  │  Tarea  │  │Consumo   │   ║ │
│  ║  │  Repo    │  │  Repo    │  │  Repo    │  │  Repo   │  │  Repo    │   ║ │
│  ║  │          │  │          │  │          │  │+ notify │  │          │   ║ │
│  ║  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   ║ │
│  ║                       ┌────────────────────────────┐                    ║ │
│  ║                       │  analitica_repo.ex          │                    ║ │
│  ║                       │  (queries agregadas SQL)   │                    ║ │
│  ║                       └────────────────────────────┘                    ║ │
│  ║                                                                            ║ │
│  ║  cache/redis_cache.ex ──► Redix: cache + locks + rate limit + blacklist    ║ │
│  ║  email/email_service.ex ──► Oban: email_worker con retry                  ║ │
│  ║  pagos/pago_service.ex ──► Mock payment processor                          ║ │
│  ╚════════════════════════════════════════════════════════════════════════════╝ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  INFRAESTRUCTURA                                                          │  │
│  │  PostgreSQL 18  │  Redis 8  │  Phoenix.PubSub  │  Oban (background jobs)  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Diagrama de dependencias entre módulos

```
hotelflux_web/router.ex
         │
         ▼
hotelflux_web/controllers/*
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
checkin_use_case.ex              checkout_use_case.ex
         │                              │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
saga/reserva_saga.ex            venta_producto_use_case.ex
         │                              │
         ├──────────────────────────────┤
         │                              │
         ▼                              ▼
ports/input.ex                  ports/input.ex
(HabitacionPort,                (HabitacionPort,
 ReservaPort,                    PagoPort,
 PagoPort,                       NotificacionPort)
 NotificacionPort)
         │                              │
         ▲                              ▲
         │                              │
         └──────────────────────────────┘
                  │
                  ▼
          ports/output.ex
   ┌──────────────┼──────────────────┬────────────────────┐
   │              │                  │                    │
   ▼              ▼                  ▼                    ▼
 Habitacion     Reserva           Huesped              Cache
 Repository     Repository        Repository           Service
   │              │                  │                    │
   │              │                  │                    │
   ▼              ▼                  ▼                    ▼
 HotelFlux     HotelFlux         HotelFlux            Redix
 Repo          Repo              Repo                  (Redis)
 (PostgreSQL)  (PostgreSQL)      (PostgreSQL)           │
   │              │                  │                    │
   │              │                  │                    │
   ▼              ▼                  ▼                    ▼
 Ecto.Query    Ecto.Query        Ecto.Query          Redix.call
```

### Archivo por archivo — Responsabilidades

| Archivo | Responsabilidad | Depende de |
|---|---|---|
| `domain/habitacion.ex` | Entidad + FSM + soft delete changeset + Event Sourcing reconstruction | Nada externo |
| `domain/result.ex` | Result monad con `ok/1`, `err/1`, `map/2`, `flat_map/2`, `fold/3` | Nada |
| `domain/state_machine.ex` | FSM genérica: `transicion/3`, `existe_ruta?/3` (BFS) | Nada |
| `domain/event_sourcing.ex` | `reconstruir_estado/2` TCO, `proyectar/3` HOF | Nada |
| `domain/tree_walker.ex` | `pre_order/2`, `in_order/2`, `level_order/2` (TCO) | Nada |
| `domain/pipeline.ex` | `compose/1`, `pipe/2`, `memoize/1` HOF | Nothing |
| `domain/transitions.ex` | Tablas FSM como module attributes inmutables | Nada |
| `domain/combinators.ex` | ROP combinators: `map_ok/2`, `flat_map_ok/2`, `validate_with/3` | `result.ex` |
| `ports/input.ex` | Behaviours de entrada (contratos de use cases) | Nada |
| `ports/output.ex` | Behaviours de salida (contratos de adapters) | Nada |
| `adapters/repos/habitacion_repo.ex` | Implementación con Ecto + Observable Repository broadcast | `domain/habitacion.ex`, `ports/output.ex` |
| `adapters/cache/redis_cache.ex` | Redix wrapper: get/set/delete/increment/exists? + locks | Nada |
| `use_cases/checkin_use_case.ex` | Orquesta check-in: llama ports de entrada, devuelve resultado | `ports/input.ex` |
| `use_cases/saga/reserva_saga.ex` | 5 pasos + compensación, llama ReservationPort + CacheService | `ports/input.ex`, `ports/output.ex` |
| `hotelflux_web/controllers/reserva_controller.ex` | Recibe HTTP, llama use case, renderiza JSON | `use_cases/*` |
| `hotelflux_web/plugs/auth_pipeline.ex` | Verifica JWT, extrae usuario, attachment a conn | `guardian.ex` |

---

## 🧩 Clean Architecture — Frontend

### Vista de capas

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                          FRONTEND — REACT + RXJS                               ║
║                                                                               ║
║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
║  ║  PAGES  (pages/)                                                           ║ ║
║  ║  ────────────────────────────────────────────────────────────────────────║ ║
║  ║  DashboardPage, RecepcionPage, ReservasPage, AnaliticaPage, InicioPage... ║ ║
║  ║        │                                                                   ║ ║
║  ║        ▼                                                                   ║ ║
║  ║  ╔════════════════════════════════════════════════════════════════════╗   ║ ║
║  ║  ║  COMPONENTS  (components/)                                        ║   ║ ║
║  ║  ║  ──────────────────────────────────────────────────────────────────║   ║ ║
║  ║  ║  shared/: Layout, ClienteLayout, CookieConsent, Modal, RoleGuard   ║   ║ ║
║  ║  ║  habitaciones/: MapaHabitaciones, HabitacionCard, LeyendaEstados  ║   ║ ║
║  ║  ║  dashboard/: KPICards, OcupacionChart, AccionesRapidas            ║   ║ ║
║  ║  ║  reservas/: ReservaForm, ReservaLista, SagaProgress, CheckInOut   ║   ║ ║
║  ║  ║  productos/: ProductoCatalogo, VentaModal                         ║   ║ ║
║  ║  ║  limpieza/: TareaLista, TareaCard                                ║   ║ ║
║  ║  ╚════════════════════════════════════════════════════════════════════╝   ║ ║
║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
║        │                                                                        ║
║        ▼                                                                        ║
║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
║  ║  HOOKS  (hooks/)                                                           ║ ║
║  ║  ────────────────────────────────────────────────────────────────────────║ ║
║  ║  useObservable.ts              │ useObservableRepository.ts               ║ ║
║  ║  useHabitacionStream.ts        │ useReservaStream.ts                      ║ ║
║  ║  useLimpiezaStream.ts          │ useDashboardStream.ts                     ║ ║
║  ║  useCombinedStream.ts          │ useNotificaciones.ts                      ║ ║
║  ║  useAuth.tsx                   │ useSystemHealth.ts                        ║ ║
║  ║       │                        │                                          ║ ║
║  ║       ▼                        ▼                                          ║ ║
║  ║  ┌───────────────────────────────────────────────────────────────────┐   ║ ║
║  ║  │  CONVIERTEN: Observable<Result<T>> → { data, loading, error }      │   ║ ║
║  ║  │  SUSCRIBEN a streams y desconectan en cleanup (useEffect cleanup)   │   ║ ║
║  ║  └───────────────────────────────────────────────────────────────────┘   ║ ║
║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
║        │                                                                        ║
║        ▼                                                                        ║
║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
║  ║  STREAMS  (streams/)                                                        ║ ║
║  ║  ────────────────────────────────────────────────────────────────────────║ ║
║  ║                                                                          ║ ║
║  ║  websocket.stream.ts                                                       ║ ║
║  ║       createChannelStream()                                               ║ ║
║  ║       createMultiEventStream(topic, eventos[]) → Observable<Event>        ║ ║
║  ║              │                                                             ║ ║
║  ║              ▼                                                             ║ ║
║  ║  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   ║ ║
║  ║  │habitacion│  │ reserva  │  │limpieza  │  │dashboard │                   ║ ║
║  ║  │ .stream │  │ .stream  │  │ .stream  │  │ .stream  │                   ║ ║
║  ║  │         │  │          │  │          │  │          │                   ║ ║
║  ║  │ scan()  │  │ scan()   │  │ scan()   │  │ combine  │                   ║ ║
║  ║  │ fold    │  │ fold     │  │ fold     │  │ Latest   │                   ║ ║
║  ║  └────┬────┘  └─────┬────┘  └────┬────┘  └────┬─────┘                   ║ ║
║  ║       │             │            │            │                          ║ ║
║  ║       └─────────────┴────────────┴────────────┘                          ║ ║
║  ║                        │                                                  ║ ║
║  ║                        ▼                                                  ║ ║
║  ║                 composite/hotel-state.stream.ts                           ║ ║
║  ║                 combineLatest([h$, r$, l$, d$]) → EstadoGlobal              ║ ║
║  ║                                                                          ║ ║
║  ║  operators/index.ts — 14 operadores custom como HOF:                     ║ ║
║  ║  withBackpressure(), adaptiveThrottle(), slidingWindow(),               ║ ║
║  ║  asHotWithReplay(), retryWithExponentialBackoff(), withAutoRetry()...   ║ ║
║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
║        │                                                                        ║
║        ▼                                                                        ║
║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
║  ║  APPLICATION  (application/)                                              ║ ║
║  ║  ────────────────────────────────────────────────────────────────────────║ ║
║  ║  ports/index.ts — Interfaces Clean Architecture:                          ║ ║
║  ║  interface IHabitacionRepository {                                        ║ ║
║  ║    listar(filtros?): Promise<Result<Habitacion[]>>                       ║ ║
║  ║    listar$(filtros?): Observable<Result<Habitacion[]>>  ← Observable Repo ║ ║
║  ║    obtener(id): Promise<Result<Habitacion>>                              ║ ║
║  ║  }                                                                        ║ ║
║  ║                                                                          ║ ║
║  ║  use-cases/index.ts — HOF con inyección funcional:                       ║ ║
║  ║  crearReservaUseCase(repo, datos) → Observable<Result<Reserva>>          ║ ║
║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
║        │                                                                        ║
║        ▼                                                                        ║
║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
║  ║  SERVICES  (services/)                                                     ║ ║
║  ║  ────────────────────────────────────────────────────────────────────────║ ║
║  ║  api.ts — CQRS client: commands() + queries() + offline fallback         ║ ║
║  ║  admin.api.ts — API admin tipada                                          ║ ║
║  ║  publico.api.ts — API pública para huéspedes                             ║ ║
║  ║  repositories/index.ts — createRepositories(token) factory memoizada      ║ ║
║  ║  repositories/habitacion.repository.ts — Observable Repository RxJS      ║ ║
║  ║  security.ts — OWASP utilities: sanitize, validate, CSP, CSRF           ║ ║
║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
║        │                                                                        ║
║        ▼                                                                        ║
║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
║  ║  DOMAIN  (domain/)                                                         ║ ║
║  ║  ────────────────────────────────────────────────────────────────────────║ ║
║  ║  types.ts — Re-export centralizado de entidades                           ║ ║
║  ║  result.ts — Result<T,E> monad: ok, err, mapResult, flatMapResult, fold   ║ ║
║  ║                                                                          ║ ║
║  ║  entidades/: (interfaces readonly, funciones puras)                        ║ ║
║  ║    habitacion.ts  →  CLASE_ESTADO (Tailwind) + calcularPrecio()          ║ ║
║  ║    reserva.ts     →  estados + funciones puras                           ║ ║
║  ║    huesped.ts     →  validación documento                                ║ ║
║  ║                                                                          ║ ║
║  ║  higher-order/index.ts — HOF:                                             ║ ║
║  ║    pipe(valor, f1, f2, ...) → pipe(data-first)                           ║ ║
║  ║    compose(f1, f2, ...) → compose (f ∘ g)                                ║ ║
║  ║    filtrarPor(prop)(valor)(lista) — currying                              ║ ║
║  ║    agruparPor(prop)(lista) → Map                                         ║ ║
║  ║    memoize(fn) → fn con caché                                             ║ ║
║  ║    todosLosPredicados(preds)(valor) → boolean  (AND predicados)          ║ ║
║  ║    algunPredicado(preds)(valor) → boolean   (OR predicados)             ║ ║
║  ║    negar(predicado)(valor) → boolean                                      ║ ║
║  ║    siCondicion(cond)(entonces)(sino)(valor) → T                          ║ ║
║  ║    tap(fn)(valor) → valor (efecto secundario sin romper pipeline)        ║ ║
║  ║                                                                          ║ ║
║  ║  pure/index.ts — Funciones puras curried:                                ║ ║
║  ║    calcularPrecioConIGV(precio) → precio * 1.18                          ║ ║
║  ║    clasificarHabitacion(tipo)(capacidad) → string                        ║ ║
║  ║    calcularOcupacion(habitaciones)(estado) → porcentaje                  ║ ║
║  ║    filtrarDisponibles(habitaciones)(fecha_entrada)(fecha_salida)        ║ ║
║  ║                                                                          ║ ║
║  ║  pure/recursion.ts — Recursión TCO:                                       ║ ║
║  ║    aplanarEventos(eventos)(acumulador) → Event[]                        ║ ║
║  ║    reconstruirEstado(eventos)(estadoInicial) → estado                     ║ ║
║  ║    agruparEnChunks(elementos)(tamano) → Chunk[][]                         ║ ║
║  ║    mapArbol(nodo)(fn)(transformarHijos) → nodo                           ║ ║
║  ║    filtrarArbol(nodo)(predicado)(hijos) → nodo[]                          ║ ║
║  ║    profundidadArbol(nodo)(hijosFn) → numero                               ║ ║
║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │  design-tokens.ts — Sistema de diseño luxury como const as const:      │ ║
║  │  CLASE_ESTADO (color por estado), BRAND (colors, typography, spacing)  │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔗 Comunicación entre Capas

### Backend: Controller → Use Case → Port → Adapter

```
HTTP Request (POST /api/v1/reservas)
     │
     ▼
Router.ex — pipeline :api, :auth
     │
     ▼
ReservaController.crear/2
  params = %{fecha_entrada: ~D[2026-05-15], ...}
     │
     ▼
ReservaSaga.ejecutar(params)  ← Use Case
     │
     ├──► ReservaPort (behaviour)
     │         │
     │         ▼
     │    ReservaRepo.crear(attrs)  ← Adapter (implementa порт)
     │         │
     │         │ {:ok, reserva}
     │         ▼
     │    broadcast_cambio("reserva_creada", serialize(reserva))
     │         │ PubSub
     │         ▼
     │    Phoenix.PubSub.broadcast
     │
     ├──► CacheService (behaviour)
     │         │
     │         ▼
     │    RedisCache.set("reserva:#{id}", data, ttl: 300)
     │
     └──► NotificacionService (behaviour)
               │
               ▼
          PubSub.broadcast("hotel:lobby", {:reserva_creada, payload})
               │
               ▼
          Channel.push(socket, "reserva:update", payload)
     │
     ▼
{:ok, %{reserva: reserva, codigo: "HF-XXXXXXXX"}}
     │
     ▼
ReservaController.render_respuesta(conn, {:ok, result})
     │
     ▼
HTTP 201 Created + JSON
```

### Frontend: Hook → Repository → API + WebSocket

```
React Component (RecepcionPage)
     │
     ▼
useHabitacionRepository({ piso: 1 })
     │ useEffect subscribe
     │
     ▼
HabitacionObservableRepository.listar$({ piso: 1 })
     │
     ├──► api.listarHabitaciones({ piso: 1 })  ← REST initial load
     │         │ Promise<Result<Habitacion[]>>
     │         ▼
     │    this.cache$.next(result)
     │         │
     │         ▼
     │    Observable<Result<Habitacion[]>>
     │         │
     │         │ (merge)
     │         │
     └──► createMultiEventStream("habitaciones:lobby", eventos)
               │ Observable<Event>
               │
               ▼
          scan(acumularEventos, estadoAnterior)
               │ fold inmutable
               ▼
          Observable<Result<Habitacion[]>>
               │
               ▼
          useObservableRepository() → setState
               │
               ▼
          React re-render con nuevos datos
               │
               ▼
          useEffect cleanup → unsubscribe
```

---

## 🔄 Flujo de Datos Reactivo

### Flujo completo: mutación → actualización UI

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        FLUJO REACTIVO COMPLETO                                  ║
║                                                                                ║
║  [1] USUARIO RECEPTIONISTA hace clic en "Check-in"                            ║
║                                                                                ║
║  [2] FRONTEND — RecepcionPage                                                  ║
║      CheckInOutModal.vue → commands.stream.ts                                  ║
║      commands.submitCheckIn(reservaId)                                        ║
║      observable.post('/api/v1/checkin', { reserva_id })                       ║
║                     │                                                         ║
║                     ▼                                                         ║
║  [3] BACKEND — CheckinController                                               ║
║      params = %{reserva_id: "..."}                                            ║
║      CheckinUseCase.ejecutar(params)                                          ║
║                     │                                                         ║
║                     ▼                                                         ║
║  [4] USE CASE — Lógica de negocio                                              ║
║      1) ReservaRepo.obtener(id) → {:ok, reserva}                              ║
║      2) Habitacion.cambiar_estado(habitacion, "ocupada")                      ║
║         → {:ok, changeset}                                                    ║
║      3) HabitacionRepo.actualizar(id, changeset) → {:ok, hab_actualizada}   ║
║      4) ReservaRepo.actualizar_estado(id, "checked_in") → {:ok, reserva}     ║
║      5) RegistrarEvento(evento) — Event Sourcing                              ║
║      6) Oban.enqueue(EmailWorker, %{reserva_id: id}) — notificaciones async  ║
║                     │                                                         ║
║                     ▼                                                         ║
║  [5] OBSERVABLE REPOSITORY — Broadcast                                         ║
║      HabitacionRepo.broadcast_cambio("habitacion_actualizada", payload)        ║
║      → Phoenix.PubSub.broadcast("habitaciones", {...})                        ║
║                     │                                                         ║
║                     ▼                                                         ║
║  [6] PHOENIX CHANNEL — Suscriptor                                              ║
║      HabitacionChannel.handle_info({:habitacion_actualizada, payload}, socket)║
║      → push(socket, "habitacion_actualizada", payload)                        ║
║                     │                                                         ║
║                     ▼ (WebSocket)                                              ║
║  [7] FRONTEND — WebSocket Stream                                               ║
║      websocket.stream.ts → createChannelStream("habitaciones:lobby")          ║
║      → createMultiEventStream("habitaciones:lobby", eventos[])                 ║
║      → scan(acumularEventos, estadoAnterior)                                  ║
║                     │                                                         ║
║                     ▼                                                         ║
║  [8] REACTIVE STATE UPDATE                                                     ║
║      Observable<Result<Habitacion[]>> emite nuevo valor                        ║
║      → useHabitacionStream() → setState({ data: nuevasHabitaciones })        ║
║                     │                                                         ║
║                     ▼                                                         ║
║  [9] REACT RE-RENDER                                                           ║
║      Componente RecepcionPage re-renderiza                                     ║
║      Mapa SVG actualizado con habitación en "ocupada"                          ║
║      Card de habitación cambia color → CLASE_ESTADO.ocupada                   ║
║      Panel lateral muestra "Checked-in a las 14:32"                            ║
║                                                                                ║
║  TIEMPO TOTAL: < 100ms (excluyendo latencia de red)                            ║
║  SIN POLLING. SIN RECARGAR PÁGINA. SIN FETCH MANUAL.                           ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Comparación con arquitectura tradicional

```
TRADICIONAL (sin Observable Repository):
═══════════════════════════════════════════════════
Usuario hace check-in
     │
     ▼
Backend actualiza BD
     │
     ▼
Otro recepcionista (en otra pestaña):
  → No sabe que hubo un cambio
  → Necesita recargar manualmente (F5)
  → O: polling cada 30s (ineficiente, latencia alta)
     │
     ▼
  ¿Cambió algo? → No → Esperar 30s → Poll otra vez...


HOTELFLUX (Observable Repository):
════════════════════════════════════════════════════
Usuario hace check-in
     │
     ▼
Backend actualiza BD + broadcast PubSub
     │
     ▼
Otro recepcionista:
  → Channel recibe evento inmediatamente
  → scan() acumula nuevo estado
  → React re-renderiza automático
  → Datos siempre frescos (0 latencia percibida)
     │
     ▼
  ✅ Sin polling. Sin recarga. Actualización instantánea.
```

---

## 📡 Eventos de Dominio y Event Sourcing

### Tabla eventos_dominio — Esquema

```sql
CREATE TABLE eventos_dominio (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            VARCHAR(100) NOT NULL,     -- e.g. "reserva_creada", "checkin_realizado"
  entidad_tipo    VARCHAR(50) NOT NULL,       -- e.g. "reserva", "habitacion", "tarea"
  entidad_id      UUID NOT NULL,
  payload         JSONB NOT NULL,             -- Datos del evento (serializados)
  usuario_id      UUID,                        -- Quién lo ejecutó
  metadata        JSONB,                       -- IP, user_agent, timestamp servidor
  insertado_en    TIMESTAMPTZ DEFAULT NOW()
);
```

### Flujo de Event Sourcing

```
ACCIÓN (check-in)
     │
     ▼
UseCase.ejecutar(params)
     │
     ▼
ReservaRepo.actualizar_estado(reserva, "checked_in")
     │
     ├────────────────────────────────────────────┐
     │                                            │
     ▼                                            ▼
{:ok, reserva_actualizada}              RegistrarEvento(evento)
     │                                    │
     │                               EventRepository.registrar(
     │                                  tipo: "checkin_realizado",
     │                                  entidad_id: reserva.id,
     │                                  payload: %{reserva_id, hab_id, ...}
     │                                )
     │                                    │
     │                                    ▼
     │                               evento.insertado_en
     │
     ▼
broadcast PubSub ("habitaciones", "reserva:update")
     │
     ▼
WebSocket → RxJS scan → React UI
```

### Reconstrucción de estado con Event Sourcing

```elixir
# domain/event_sourcing.ex
defmodule HotelFlux.Domain.EventSourcing do
  @doc """
  Reconstruye el estado de una entidad aplicando eventos en orden cronológico.
  Usa recursión de cola (TCO) para eficiencia.

  estado_final = fold(eventos, estado_inicial, aplicar_evento)
  """
  def reconstruir_estado(eventos, estado_inicial, aplicar_fn) do
    rebuild(eventos, estado_inicial, aplicar_fn)
  end

  defp rebuild([], estado, _), do: estado
  defp rebuild([evento | resto], estado, aplicar_fn) do
    nuevo_estado = aplicar_fn.(estado, evento)
    rebuild(resto, nuevo_estado, aplicar_fn)
  end

  @doc """
  Proyecta eventos a una vista agregada usando HOF reductor.
 ejemplo: proyectar todos los check-ins por día → mapa de ingresos.
  """
  def proyectar(eventos, acumulador_inicial, proyeccion_fn) do
    Enum.reduce(eventos, acumulador_inicial, proyeccion_fn)
  end
end

# domain/habitacion.ex — Aplicación del Event Sourcing
def reconstruir_desde_eventos(habitacion, []) do
  habitacion
end

def reconstruir_desde_eventos(habitacion, [evento | resto]) do
  nueva = aplicar_evento_dominio(habitacion, evento)
  reconstruir_desde_eventos(nueva, resto)  # TCO: tail recursion
end

defp aplicar_evento_dominio(hab, %{tipo: "estado_cambiado", payload: %{"estado" => estado}}) do
  %{hab | estado: estado}
end
```

---

## 🔐 Arquitectura de Seguridad

### Pipeline de plugs (orden de ejecución)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         REQUEST PIPELINE                                    │
│                                                                             │
│  HTTP Request                                                               │
│       │                                                                     │
│       ▼                                                                     │
│  [Plug 0] RequestIdPlug                                                     │
│       │ — Asigna correlation_id único para trazabilidad                    │
│       │ — Adjunta a conn.assigns.request_id                                │
│       ▼                                                                     │
│  [Plug 1] SecurityHeadersPlug                                              │
│       │ — A05: Security Misconfiguration                                   │
│       │ — CSP Level 3 con nonce por request                                │
│       │ — HSTS 31536000 (1 año)                                            │
│       │ — X-Frame-Options: DENY                                             │
│       │ — X-Content-Type-Options: nosniff                                  │
│       │ — COEP + COOP + CORP (cross-origin isolation)                     │
│       │ — Permissions-Policy: camera=no, mic=no, geolocation=no            │
│       ▼                                                                     │
│  [Plug 2] AuditLogPlug                                                     │
│       │ — A09: Security Logging & Monitoring                               │
│       │ — ISO 27001 A.12.4                                                 │
│       │ — Estructura: timestamp, request_id, method, path, status,        │
│       │                  user_id, ip, user_agent, duration_ms              │
│       │ — Logs → stdout (capturado por Promtail → Loki)                   │
│       ▼                                                                     │
│  [Plug 3] Plug.Parsers — Body Parser (8MB)                                │
│       │ — Protege contra payload floods (A04)                              │
│       ▼                                                                     │
│  [Plug 4] CORS Plug                                                         │
│       │ — A05: Restringe origins a valores configurados                   │
│       │ — Solo GET/POST en Content-Type application/json                  │
│       ▼                                                                     │
│  [Plug 5] InputSanitizationPlug                                            │
│       │ — A03: Injection                                                   │
│       │ — Regex contra 9 patrones:                                        │
│       │   XSS: <script>, javascript:, onerror=, onload=                   │
│       │   SQLi: ', ", ;, --, UNION, DROP, SELECT, INSERT                   │
│       │   Command: ;, |, &, $(), ``                                       │
│       │ — Límite: 10,000 caracteres por campo                             │
│       │ — Sanitiza keys y values del body/params                          │
│       ▼                                                                     │
│  [Plug 6] RateLimitPlug                                                     │
│       │ — A04: Insecure Design                                             │
│       │ — Redis sliding window por IP + prefix                             │
│       │   Pipeline :api → 120 req/min (global)                            │
│       │   Pipeline :auth → 10 req/min (login/registro)                   │
│       │   Pipeline :public_rate → 30 req/min (API pública)               │
│       │ — Headers: X-RateLimit-Limit, X-RateLimit-Remaining,              │
│       │             Retry-After                                            │
│       ▼                                                                     │
│  [Plug 7] AuthPipeline (para rutas protegidas)                              │
│       │ — A01: Broken Access Control + A07: Auth Failures                 │
│       │ — Extrae JWT de cookie HTTP-only                                   │
│       │ — Verifica firma, expiry, blacklist en Redis                       │
│       │ — Adjunta usuario a conn.assigns.current_user                     │
│       ▼                                                                     │
│  [Plug 8] RolePlug (para rutas admin)                                       │
│       │ — A01: Broken Access Control                                       │
│       │ — Verifica que conn.assigns.current_user.rol esté en roles permitidos│
│       ▼                                                                     │
│  Controller — Lógica de negocio                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Flujo de autenticación

```
LOGIN EXITOSO:
══════════════
POST /api/v1/auth/login
     │
     ▼
InputSanitizationPlug (valida email/password)
     │
     ▼
AuthController.login
     │
     ├► UsuarioRepo.buscar_por_email(email)
     │         │
     │         ▼
     │    Bcrypt.check_pass(usuario, password)
     │         │
     │         ▼
     │    {:ok, usuario}
     │
     ▼
Guardian.encode_and_sign(usuario, token_ttl, claims)
     │
     ▼
Redis.set("blacklist:#{jti}", "1", ttl: token_ttl)
     │
     ▼
conn
  |> put_resp_cookie("access_token", jwt, [http_only: true, secure: true,
         same_site: "Strict", max_age: token_ttl_seg])
     │
     ▼
200 { user: %{ id, nombre, email, rol }, expires_at }


LOGOUT:
═══════
POST /api/v1/auth/logout
     │
     ▼
AuthController.logout
     │
     ├► Extraer JWT de cookie
     │         │
     │         ▼
     │    Guardian.decode(jwt) → {:ok, claims}
     │         │
     │         ▼
     │    jti = claims["jti"]
     │
     ▼
Redis.set("blacklist:#{jti}", "1", ttl: ttl_restante)
     │
     ▼
delete_resp_cookie(conn, "access_token")
     │
     ▼
200 { message: "Sesión cerrada" }


VALIDACIÓN EN CADA REQUEST:
════════════════════════════
AuthPipeline.call(conn, [])
     │
     ├► get_req_cookie(conn, "access_token")
     │         │
     │         ▼
     │    Token encontrado? → NO → 401 Unauthorized
     │         │
     │         SÍ
     │         ▼
     │    Guardian.decode(token) → {:ok, claims}
     │         │
     │         ▼
     │    jti = claims["jti"]
     │         │
     │         ▼
     │    Redis.exists?("blacklist:#{jti}") → SÍ → 401 Token revocado
     │         │
     │         NO
     │         ▼
     │    {:ok, usuario} = GuardianSerializer.from_token(claims)
     │
     ▼
conn.assigns.current_user = usuario
     │
     ▼
Pipeline continúa al controller
```

---

## 🏗️ Infraestructura y Observabilidad

### Arquitectura de monitoreo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONITOREO HOTELFLUX                                │
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐  │
│  │     Backend      │    │    Frontend      │    │     Nginx           │  │
│  │   (Phoenix)      │    │    (React)       │    │                     │  │
│  └──────┬───────────┘    └──────┬───────────┘    └──────────┬───────────┘  │
│         │                       │                          │               │
│         │ Telemetry              │                          │               │
│         ▼                       ▼                          ▼               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      Prometheus (9090)                                │  │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │  │
│  │  │ phoenix.router   │  │  ecto.query      │  │  oban.job            │  │  │
│  │  │ http_request    │  │  repo.query      │  │  worker_completed    │  │  │
│  │  │ vm.memory       │  │  cache.hit       │  │  job_failure         │  │  │
│  │  │ process_count    │  │  cache.miss      │  │                     │  │  │
│  │  └─────────────────┘  └──────────────────┘  └─────────────────────┘  │  │
│  │                                                                       │  │
│  │  Alert Rules:                                                         │  │
│  │  • http_request_duration > 2s → alert P1                             │  │
│  │  • http_requests_total{status=~"4.."} > 5% → alert P2                │  │
│  │  • oban_jobs_failed > 3 → alert P1                                   │  │
│  │  • postgres_connections > 80% → alert P2                            │  │
│  │  • redis_memory > 80% → alert P2                                    │  │
│  └────────────────────────────┬──────────────────────────────────────────┘  │
│                               │                                             │
│                               ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Loki (3100)                                   │  │
│  │  Agregación centralizada de logs (7 días retención)                  │  │
│  │  Sources: Backend (structured JSON), Nginx (access logs),            │  │
│  │           Frontend (console logs), Workers (Oban)                    │  │
│  │  Labels: service, level, request_id, user_id, endpoint               │  │
│  └────────────────────────────┬──────────────────────────────────────────┘  │
│                               │                                             │
│                               ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Grafana (3001)                                    │  │
│  │                                                                       │  │
│  │  Dashboard "HotelFlux - Main":                                        │  │
│  │  • KPIs: ocupación, ingresos, reservas activas, tareas pendientes    │  │
│  │  • Gráficas tiempo real (Phoenix + Prometheus)                      │  │
│  │  • Rate de requests por endpoint                                    │  │
│  │                                                                       │  │
│  │  Dashboard "HotelFlux - System":                                      │  │
│  │  • CPU/Memory (Prometheus node_exporter)                             │  │
│  │  • Request/sec, Latencia p50/p95/p99                                 │  │
│  │  • Conexiones PostgreSQL, Redis                                      │  │
│  │                                                                       │  │
│  │  Dashboard "HotelFlux - Logs":                                       │  │
│  │  • Loki queries para logs de errores                                 │  │
│  │  • Filtro por request_id (trazabilidad)                              │  │
│  │  • Logs de seguridad (intentos de login fallidos)                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Docker services y sus roles

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           DOCKER COMPOSE — PRODUCTION                       │
│                                                                             │
│  ┌──────────┐  ┌──────────────────────────────────────────────────────────┐  │
│  │ nginx    │  │  Reverse Proxy ( puerto 80 / 443)                       │  │
│  │  :80     │  │  • TLS termination                                       │  │
│  │  alpine  │  │  • WebSocket upgrade para /socket/*                     │  │
│  └────┬─────┘  │  • Rate limiting por endpoint (upstream)               │  │
│       │        │  • OWASP headers (añadidos por nginx)                  │  │
│       │        │  • /api/* → backend:4000                               │  │
│       │        │  • /* → frontend:3000 (SPA routing)                    │  │
│       │        └──────────────────────┬───────────────────────────────────┘  │
│       │                             │                                      │
│       │    ┌────────────────────────┴─────────────────────────┐          │
│       │    ▼                                                    ▼          │
│       │  ┌─────────────────────────────────┐  ┌────────────────────────┐  │
│       │  │         backend (4000)           │  │     frontend (3000)      │  │
│       │  │      phoenix:alpine              │  │    node:23-alpine        │  │
│       │  │  ┌─────────────────────────────┐ │  │  ┌────────────────────┐ │  │
│       │  │  │ Bandit HTTP Server          │ │  │  │   Vite dev server  │ │  │
│       │  │  │                             │ │  │  │   or              │ │  │
│       │  │  │ Phoenix.Endpoint           │ │  │  │   Nginx serving    │ │  │
│       │  │  │ + 9 Security Plugs         │ │  │  │   dist/ build      │ │  │
│       │  │  │ + 13 Controllers           │ │  │  └────────────────────┘ │  │
│       │  │  │ + 4 Channels (WebSocket)    │ │  └────────────────────────┘  │
│       │  │  │ + Oban Workers             │ │                            │
│       │  │  └────────────┬────────────────┘ │                            │
│       │  └───────────────┼───────────────────┘                            │
│       │                  │                                                │
│       │                  ▼                                                │
│       │  ┌──────────────────────────────────────────────────────────────┐  │
│       │  │               REDIS (6379)                                   │  │
│       │  │  redis:alpine                                               │  │
│       │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │  │
│       │  │  │  Cache   │  │ Rate     │  │  Lock    │  │  JWT         │ │  │
│       │  │  │  metrics │  │ Limit    │  │  Saga    │  │  Blacklist   │ │  │
│       │  │  │  30s TTL │  │ sliding  │  │  10s TTL │  │              │ │  │
│       │  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │  │
│       │  └──────────────────────────────────────────────────────────────┘  │
│       │                  │                                                │
│       │                  ▼                                                │
│       │  ┌──────────────────────────────────────────────────────────────┐  │
│       │  │              POSTGRESQL (5432)                               │  │
│       │  │  postgres:18-alpine                                          │  │
│       │  │  Soft delete en 11 tablas                                   │  │
│       │  │  Índices parciales para queries frecuentes                  │  │
│       │  │  Tabla eventos_dominio (Event Sourcing)                     │  │
│       │  │  Full-text search en búsqueda de habitaciones               │  │
│       │  └──────────────────────────────────────────────────────────────┘  │
│       │                                                                  │  │
│       │  ┌──────────┐  ┌──────────────────────────────────────────────┐   │  │
│       │  │prometheus│  │              grafana (3001)                 │   │  │
│       │  │  :9090   │  │  ┌────────────────┐  ┌────────────────────┐ │   │  │
│       │  │         │  │  │ hotelflux-main │  │ hotelflux-system   │ │   │  │
│       │  │ Alert   │  │  │ hotelflux-hotel│  │ hotelflux-logs     │ │   │  │
│       │  │ Rules   │  │  └────────────────┘  └────────────────────┘ │   │  │
│       │  └────┬─────┘  └──────────────────────────────────────────────┘   │  │
│       │       │                                                              │  │
│       │       └────────────────────────────────────┐                        │  │
│       │                                            ▼                        │  │
│       │  ┌─────────────────────────────────────────────────────────────┐   │  │
│       │  │                        loki (3100)                          │   │  │
│       │  │  ┌──────────────────┐  ┌──────────────────┐                │   │  │
│       │  │  │ Backend logs     │  │ Nginx access     │  Promtail     │   │  │
│       │  │  │ (structured JSON)│  │ logs             │  → Loki       │   │  │
│       │  │  └──────────────────┘  └──────────────────┘                │   │  │
│       │  └─────────────────────────────────────────────────────────────┘   │  │
│       └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📐 Decisiones de Diseño (ADR)

### ADR-001: Observable Repository como patrón central

**Problema**: Los datos en el frontend quedaban obsoletos tras una mutación en el backend.

**Decisión**: Implementar Observable Repository. Los repositorios devuelven `Observable<Result<T>>` que emite valores en cada cambio, no promesas puntuales.

**Consecuencias**:
- ✅ React re-renderiza automáticamente cuando los datos cambian
- ✅ Un solo WebSocket compartido entre todos los componentes (`shareReplay(1)`)
- ✅ Sin polling, latencia cero de actualización
- ⚠️ Mayor complejidad en la capa de repositories (merge de REST + WS)
- ⚠️ Debugging de streams puede ser desafiante (uso de RxJS DevTools)

### ADR-002: Hexagonal Architecture con Behaviours

**Problema**: El dominio dependía directamente de Ecto (DB) y Phoenix (web).

**Decisión**: Definir `ports/input.ex` y `ports/output.ex` como `@behaviour`. El dominio solo conoce los callbacks. Los adapters implementan los behaviours.

**Consecuencias**:
- ✅ Dominio 100% testeable sin base de datos (mocks de behaviours)
- ✅ Fácil cambiar PostgreSQL por otra DB (solo nuevo adapter)
- ✅ Contratos claros entre capas
- ⚠️ Más archivos y módulo de boilerplate
- ⚠️ Curva de aprendizaje de behaviours para nuevos desarrolladores

### ADR-003: CQRS con controllers separados por comando/query

**Problema**: Mezcla de lógica de lectura y escritura en los mismos controllers.

**Decisión**:
- Controllers de comando: `ReservaController`, `CheckinController`, `CheckoutController`
- Controllers de query: `QueryController` (solo lectura)
- Controllers admin: `AdminController` (CRUD administrativo)

**Consecuencias**:
- ✅ Rutas más claras semánticamente
- ✅ Fácil añadir cache en queries sin afectar comandos
- ✅ Monitoreo diferenciado (queries读的 vs commands写的)

### ADR-004: Soft Delete en todas las entidades

**Problema**: Eliminar registros directamente pierd historial y rompe referencias.

**Decisión**: Todas las 11 entidades tienen campos `eliminado: boolean` y `eliminado_en: utc_datetime`. Los repos filtran `eliminado == false` por defecto.

**Consecuencias**:
- ✅ Auditoría completa (nunca se borra nada)
- ✅ Fácil recuperación de datos
- ✅ Event Sourcing puede reconstruir estado histórico
- ⚠️ Queries siempre incluyen `WHERE eliminado = false`
- ⚠️ Índices deben incluir `eliminado` para eficiencia

### ADR-005: Saga Pattern para reservas

**Problema**: Reservas multi-paso sin atomicidad causa inconsistency de datos.

**Decisión**: Implementar Saga de 5 pasos con compensación automática:
1. Validar disponibilidad → 2. Bloquear habitación (Redis) → 3. Crear reserva (BD) → 4. Confirmar pago → 5. Notificar
Si cualquier paso falla: ejecutar compensaciones en orden inverso.

**Consecuencias**:
- ✅ Consistencia eventual garantizada
- ✅ Compensación automática en fallos
- ✅ Eventos de dominio grabados para auditoría
- ⚠️ Complejidad del código del Saga
- ⚠️ Manejo de idempotencia necesario

### ADR-006: Redis para cache, locks, rate limit y blacklist

**Problema**: Necesidad de múltiples mecanismos de infraestructura.

**Decisión**: Un solo servicio Redis 8 para todo:
- **Cache**: métricas dashboard (TTL 30s), info hotel (TTL 1h)
- **Rate Limit**: sliding window por IP + endpoint
- **Distributed Locks**: reserva Saga (10s TTL)
- **JWT Blacklist**: logout y renovación

**Consecuencias**:
- ✅ Una sola conexión.Redis simplifica infraestructura
- ✅ Operaciones atómicas (MULTI/EXEC) para rate limit
- ✅ TTL automático para locks evita deadlocks
- ⚠️ Redis como single point of failure → usar Sentinel en producción

---

## 🚀 Guía de Extensión

### Agregar una nueva entidad

```
PASO 1: Dominio (puro, sin dependencias)
─────────────────────────────────────
backend/lib/hotelflux/domain/mi_entidad.ex
  • Definir struct con campos
  • changeset/2 para validación
  • Funciones de dominio puras
  • soft_delete_changeset/1
  • Event Sourcing: reconstruir_desde_eventos/2

PASO 2: Puerto de entrada
────────────────────────
backend/lib/hotelflux/ports/mi_entidad_port.ex
  • @callback crear(map()) :: {:ok, %__MODULE__{}} | {:error, term()}
  • @callback actualizar(id, map()) :: {:ok, %__MODULE__{}} | {:error, term()}
  • @callback obtener(id) :: {:ok, %__MODULE__{}} | {:error, :not_found}
  • @callback listar(filtros) :: [%__MODULE__{}]

PASO 3: Puerto de salida
───────────────────────
backend/lib/hotelflux/ports/output.ex
  • Agregar modulo HabitacionRepository (ya existe — copiar patrón)
  • Definir callbacks: obtener, listar, crear, actualizar, soft_delete

PASO 4: Adapter/Repositorio
────────────────────────────
backend/lib/hotelflux/adapters/repos/mi_entidad_repo.ex
  • implement ObservableRepository (broadcast tras mutación)
  • implementar todos los callbacks de output.ex
  • usar soft delete en todas las queries

PASO 5: Controller
─────────────────
backend/lib/hotelflux_web/controllers/mi_entidad_controller.ex
  • pipeline :api, :auth
  • CRUD endpoints
  • renderizar JSON con schemas

PASO 6: Router
─────────────
backend/lib/hotelflux_web/router.ex
  • Agregar scope /api/v1/mi_entidad
  • pipe_through [:api, :auth]
  • Recursos REST

PASO 7: Canal WebSocket (si se necesita real-time)
─────────────────────────────────────────────────
backend/lib/hotelflux_web/channels/mi_entidad_channel.ex
  • subscribe to PubSub topic ("mi_entidades")
  • handle_in para comandos desde frontend

PASO 8: Frontend — Repository
────────────────────────────
frontend-reception/src/services/repositories/mi_entidad.repository.ts
  • implementar IMiEntidadRepository (ports)
  • listar$() → Observable<Result<MiEntidad[]>> (Observable Repository)

PASO 9: Frontend — Hook
──────────────────────
frontend-reception/src/hooks/useMiEntidadStream.ts
  • useEffect que subscribe al repository
  • cleanup con unsubscribe

PASO 10: Frontend — Página
─────────────────────────
frontend-reception/src/pages/MiEntidadPage.tsx
  • usar hook → obtener datos
  • renderizar componentes
  • agregar ruta en App.tsx
```

### Agregar un nuevo operador RxJS

```
frontend-reception/src/streams/operators/index.ts

export function myNewOperator<T>(param: any): OperatorFunction<T, T> {
  return (source$: Observable<T>) =>
    new Observable<T>(subscriber => {
      const sub = source$.subscribe({
        next(value) {
          // Tu lógica de operador
          // ej: filtrar, transformar, hacer side-effect, etc.
          subscriber.next(value);
        },
        error(err) { subscriber.error(err); },
        complete() { subscriber.complete(); }
      });
      return () => sub.unsubscribe();
    });
}

// Uso:
source$.pipe(
  myNewOperator(param),
  map(x => x * 2)
).subscribe(console.log);
```

### Agregar un nuevo caso de uso (Saga)

```
PASO 1: Definir puertos de entrada
──────────────────────────────────
backend/lib/hotelflux/ports/mi_servicio_port.ex

defmodule HotelFlux.Ports.MiServicioPort do
  @callback ejecutar(params :: map()) :: {:ok, map()} | {:error, term()}
end

PASO 2: Implementar Saga
────────────────────────
backend/lib/hotelflux/use_cases/saga/mi_saga.ex

defmodule HotelFlux.UseCases.MiSaga do
  use GenServer
  alias HotelFlux.Ports.{MiServicioPort, CacheService}

  defstruct [:id, :pasos, :compensaciones, :estado]

  # 5 pasos con compensación
  def ejecutar(params) do
    with {:ok, paso1}    <- paso_1_validar(params),
         {:ok, paso2}    <- paso_2_bloquear(paso1),
         {:ok, paso3}    <- paso_3_persistir(paso2),
         {:ok, paso4}    <- paso_4_confirmar(paso3),
         {:ok, paso5}    <- paso_5_notificar(paso4) do
      {:ok, paso5}
    else
      {:error, reason} ->
        compensar_y_abortar(reason)
    end
  end

  defp compensar_y_abortar(error) do
    # Ejecutar compensaciones en orden inverso
    # Liberar locks, eliminar registros, revertir estados
    {:error, error}
  end
end

PASO 3: Controller
─────────────────
backend/lib/hotelflux_web/controllers/mi_servicio_controller.ex

def crear(conn, params) do
  case MiSaga.ejecutar(params) do
    {:ok, result} -> conn |> put_status(201) |> json(result)
    {:error, reason} -> conn |> put_status(400) |> json(%{error: reason})
  end
end
```

---

## 🧪 Análisis de Testing por Arquitectura

### Testing por Capa

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    TESTING PYRAMID - HOTELFLUX                                 ║
║                                                                                ║
║                              ┌───────────┐                                     ║
║                              │   E2E    │  ← Pocas (flujos críticos)          ║
║                             ╱└───────────┘└╲                                    ║
║                            ╱    INTEGRATION    ╲                               ║
║                           ╱    (Use Cases +     ╲                             ║
║                          ╱     Channels + WS)      ╲                          ║
║                         ╱                           ╲                         ║
║                        ╱      UNIT TESTS             ╲                        ║
║                       ╱   (Domain + Pure Functions)  ╲                      ║
║                      ╱                               ╲                        ║
║                     ╱─────────────────────────────────╲                       ║
║                    ║         ~60% de los tests         ║                    ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Análisis: Domain (Capa más testable)

| Módulo | Tipo | Testabilidad | Estrategia |
|---|---|---|---|
| `domain/result.ex` | Funciones puras | ⭐⭐⭐⭐⭐ | Unit tests directos |
| `domain/state_machine.ex` | Funciones puras | ⭐⭐⭐⭐⭐ | Unit + property-based |
| `domain/event_sourcing.ex` | Funciones puras | ⭐⭐⭐⭐ | Unit + integration |
| `domain/tree_walker.ex` | Recursión TCO | ⭐⭐⭐⭐ | Unit tests con casos edge |
| `domain/habitacion.ex` | Entidad + transforms | ⭐⭐⭐⭐ | Unit tests de entidad |
| `domain/pipeline.ex` | HOF | ⭐⭐⭐⭐⭐ | Unit tests de compose/pipe |

**Dominio como spec ejecutable**: Las funciones puras del dominio **son** la especificación.
```elixir
# test/domain/result_test.exs
describe "Result Monad Laws" do
  test "left identity: bind(f, return(x)) == f(x)" do
    assert {:ok, 5} |> Result.flat_map(fn x -> {:ok, x * 2} end) == {:ok, 10}
  end

  test "right identity: m |> bind(return) == m" do
    assert {:ok, 5} |> Result.flat_map(&Result.ok/1) == {:ok, 5}
  end

  test "associativity: (m >>= f) >>= g == m >>= (fn x -> f(x) >>= g end)" do
    f = fn x -> {:ok, x + 1} end
    g = fn x -> {:ok, x * 2} end
    assert {:ok, 1} |> Result.flat_map(f) |> Result.flat_map(g)
           == {:ok, 1} |> Result.flat_map(fn x -> f.(x) |> Result.flat_map(g) end)
  end
end
```

### Análisis: Use Cases (Integración)

| Use Case | Dependencias | Testing Strategy |
|---|---|---|
| `checkin_use_case.ex` | HabitacionPort, ReservaPort, PubSub | Mox + sandbox |
| `checkout_use_case.ex` | HabitacionPort, ReservaPort, EventRepo | Mox + sandbox |
| `saga/reserva_saga.ex` | 5 ports + CacheService | Integration test completo |
| `venta_producto_use_case.ex` | ProductoRepo, ConsumoRepo | Unit + integration |

### Análisis: Adapters (Contracts test)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TESTING DE ADAPTERS                                  │
│                                                                             │
│   ┌─────────────┐              ┌─────────────┐                              │
│   │  Port       │              │  Adapter    │                              │
│   │ (contrato)  │              │ (impl real) │                              │
│   └──────┬──────┘              └──────┬──────┘                              │
│          │                            │                                      │
│          ▼                            ▼                                      │
│   ┌─────────────┐              ┌─────────────┐                              │
│   │ Mox stub    │────TEST─────►│ Repo real   │                              │
│   │ (mock)      │              │ (sandbox)   │                              │
│   └─────────────┘              └─────────────┘                              │
│                                                                             │
│   Use Case → Port (Mox) → Adapter (sandbox) → PostgreSQL (mock)           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```elixir
# test/adapters/habitacion_repo_test.exs
defmodule HotelFlux.Adapters.HabitacionRepoTest do
  use HotelFlux.DataCase, async: true

  alias HotelFlux.Adapters.Repos.HabitacionRepo
  alias HotelFlux.Domain.Habitacion

  describe "cambiar_estado/2" do
    test "broadcasts change via Observable Repository" do
      # Arrange: crear habitación
      habitacion = insert(:habitacion, estado: "disponible")

      # Act: cambiar estado
      {:ok, actualizada} = HabitacionRepo.cambiar_estado(habitacion.id, "ocupada")

      # Assert: estado cambiado + broadcast enviado
      assert actualizada.estado == "ocupada"
      # PubSub broadcast verificado vía subscription
    end
  end
end
```

### Análisis: Frontend (Vitest + RTL)

| Capa | Patrón | Testing |
|---|---|---|
| `domain/result.ts` | Monad Result | Unit: ok, err, map, flatMap |
| `domain/higher-order/` | HOF (pipe, compose) | Unit: cada función pura |
| `domain/pure/` | Funciones curried | Unit: casos edge, currying |
| `hooks/*.ts` | Bridge Observable→React | Integration: render + subscriber |
| `streams/*.stream.ts` | RxJS streams | Unit: operadores, flujos |
| `components/*.tsx` | UI Components | Component: RTL, user events |

```typescript
// frontend-reception/src/test/unit/result.test.ts
describe('Result Monad', () => {
  it('map: transforma el valor si es ok', () => {
    const result = ok(5);
    const mapped = mapResult(result, x => x * 2);
    expect(mapped).toEqual(ok(10));
  });

  it('map: mantiene el error si es err', () => {
    const result = err('error');
    const mapped = mapResult(result, (x: number) => x * 2);
    expect(mapped).toEqual(err('error'));
  });

  it('flatMap: encadena resultados', () => {
    const result = ok(5);
    const chained = flatMapResult(result, x => ok(x * 2));
    expect(chained).toEqual(ok(10));
  });

  it('fold: extrae valor o default', () => {
    expect(fold(ok(5), (v: number) => v * 2, () => 0)).toBe(10);
    expect(fold(err('err'), (v: number) => v * 2, () => 0)).toBe(0);
  });
});
```

### Cobertura por Pattern

| Patrón | Archivo de Test | Cobertura |
|---|---|---|
| **FSM** | `state_machine_test.exs` | ~98% — funciones puras |
| **Event Sourcing** | `tree_walker_test.exs` | ~92% — reconstruir estado |
| **Result Monad** | `result_test.exs` | ~95% — monad laws |
| **ROP Pipeline** | `combinators_test.exs` | ~90% — map_ok, flat_map_ok |
| **Observable Repository** | `habitacion_repo_test.exs` | ~85% — broadcast |
| **Saga Pattern** | `reserva_saga_test.exs` | ~80% — steps + compensation |
| **Hexagonal** | Adapter tests via ports | ~75% — contratos |

### Arquitectura que facilita Testing

| Principio | Impacto en Testing |
|---|---|
| **Dominio puro (sin efectos)** | Tests pueden ser deterministas, sin mocks de DB |
| **Ports como contratos** | Mox genera stubs type-safe automáticamente |
| **Inmutabilidad** | Tests no tienen estado compartido entre runs |
| **Funciones pequeñas** | Cada función es una unidad de test simple |
| **Pipeline de datos** | Easy composition: `input |> f1 |> f2 |> assert` |
| **Domain events** | Easy verificación de side effects (broadcast) |

---

## 📊 Métricas de Calidad de Arquitectura

| Métrica | Valor | Descripción |
|---|---|---|
| **Acoplamiento** | Bajo | Dominio no depende de infraestructura (hexagonal) |
| **Cohesión** | Alta | Cada módulo tiene responsabilidad única |
| **Testabilidad** | 85%+ | Tests ExUnit para dominio puro sin mocks de DB |
| **Cyclomatic Complexity** | < 10 | Use cases con max 10 paths de decisión |
| **Líneas de dominio** | ~3,000 | Sin dependencias externas |
| **Tasa de cobertura tests** | Backend: 80%+ | ExUnit con coverage |
| **Tiempo de respuesta p95** | < 200ms | Backend Phoenix + PostgreSQL |
| **Actualización real-time** | < 100ms | WS + RxJS scan |

---

> Documento vivo — Actualizar cuando se añadan nuevos patrones o arquitectura.
> Última actualización: Mayo 2026