# 🏨 HotelFlux — Sistema de Gestión Hotelera Reactiva

> **Proyecto académico** — Programación Funcional y Reactiva — Noveno Ciclo
>
> Backend: Elixir/Phoenix | Frontend: React/RxJS | Base de datos: PostgreSQL | Contenedores: Docker

---

<div align="center">

### Stack Tecnológico

![Elixir](https://img.shields.io/badge/Elixir-1.17+-4B275F?style=for-the-badge&logo=elixir&logoColor=white)
![Phoenix](https://img.shields.io/badge/Phoenix-1.7.18-DC5824?style=for-the-badge&logo=phoenix&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![RxJS](https://img.shields.io/badge/RxJS-7.8-B7178C?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)

### Patrones de Diseño

![Observable Repository](https://img.shields.io/badge/Pattern-Observable%20Repository-6366f1?style=for-the-badge)
![Hexagonal + Clean](https://img.shields.io/badge/Arch-Hexagonal%20%2B%20Clean-0ea5e9?style=for-the-badge)
![CQRS + Event Sourcing](https://img.shields.io/badge/Pattern-CQRS%20%2B%20ES-10b981?style=for-the-badge)
![Saga Pattern](https://img.shields.io/badge/Pattern-Saga-f59e0b?style=for-the-badge)
![FSM + ROP](https://img.shields.io/badge/Pattern-FSM%20%2B%20ROP-ef4444?style=for-the-badge)

### Seguridad

![OWASP Top 10](https://img.shields.io/badge/Security-OWASP%20Top%2010%202021-red?style=for-the-badge)
![ISO 27001](https://img.shields.io/badge/Compliance-ISO%2027001-green?style=for-the-badge)
![NIST 800-63B](https://img.shields.io/badge/Password-NIST%20800--63B-blue?style=for-the-badge)

</div>

---

## Tabla de Contenidos

1. [Visión General](#-visión-general)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Patrón Observable Repository](#-observable-repository-pattern)
4. [Patrones Funcionales y Reactivos](#-patrones-demostrados)
5. [Bloqueante vs No-Bloqueante](#-bloqueante-vs-no-bloqueante)
6. [Schedulers: asyncScheduler y queueScheduler](#-schedulers-asyncscheduler-y-queuescheduler)
7. [El Manifiesto Reactivo](#-el-manifiesto-reactivo)
8. [Paradigma Funcional vs Imperativo](#-paradigma-funcional-vs-imperativo)
9. [Concurrencia BEAM (Elixir)](#-concurrencia-beam-elixir)
10. [Seguridad — OWASP + ISO 27001](#-seguridad)
6. [Flujo de Datos en Tiempo Real](#-flujo-reactivo)
7. [Saga Pattern — Reservas Compensadas](#-saga-pattern)
8. [Estructura del Proyecto](#-estructura-del-proyecto)
9. [Guías de Inicio](#-inicio-rápido)
10. [Credenciales de Demo](#-roles-y-acceso)
11. [Referencia de API](#-api-endpoints)
12. [Frontend Público — Huéspedes](#-página-pública)
13. [Analytics Dashboard](#-analytics-dashboard)
14. [Infraestructura — Docker](#-docker-services)
15. [Conceptos Académicos](#-conceptos-académicos)
16. [Historias de Usuario](#-historias-de-usuario)
17. [Informe de Testing (IT)](#-informe-de-testing-it)
18. [Documentación Adicional](#-documentación)

---

## 🎯 Visión General

**HotelFlux** es un sistema completo de gestión hotelera que demuestra la aplicación práctica de **programación funcional** (Elixir) y **programación reactiva** (RxJS) en un escenario real.

### ¿Qué hace único a este proyecto?

| Característica | Descripción |
|---|---|
| **Observable Repository** | Los repositorios devuelven streams (`Observable<Result<T>>`) que emiten valores en cada cambio, no promesas puntuales. El frontend se actualiza automáticamente sin polling. |
| **Hexagonal + Clean** | Arquitectura de puertos y adaptadores en el backend; Clean Architecture en el frontend. El dominio está completamente desacoplado. |
| **CQRS + Event Sourcing** | Separación clara de comandos y queries; tabla de eventos inmutables que permite reconstruir estado histórico. |
| **Saga Pattern** | Reservas de 5 pasos con compensación automática: si cualquier paso falla, los anteriores se revierten. |
| **FSM Pura** | Máquina de estados finita implementada como funciones puras en Elixir — sin efectos secundarios. |
| **Railway Oriented Programming** | Manejo de errores funcional con `{:ok, v}` / `{:error, e}` en pipelines encadenados. |
| **Seguridad OWASP + ISO 27001** | 9 plugs de seguridad, 14 controles OWASP A01-A10, 13 controles ISO 27001. |

### Módulos del sistema

```
frontend-reception/       → SPA React 19 + RxJS + Tailwind CSS v4
backend/                  → API Phoenix + Elixir 1.17
nginx/                    → Reverse proxy + WebSocket
infra/                    → Prometheus + Grafana + Loki (monitoreo)
docker-compose.yml        → Desarrollo local
docker-compose.prod.yml   → Despliegue en VPS
```

---

## 📐 Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              NGINX (puerto 80 / 443)                          │
│         Reverse Proxy  ·  SSL/TLS  ·  Rate Limiting  ·  OWASP Headers        │
├──────────────────────────────┬───────────────────────────────────────────────┤
│    /api/*  →  Backend        │   /socket  →  WebSocket  →  Backend             │
│    /*      →  Frontend        │   /api/auth/*  →  Rate Limit 10r/min          │
│                              │   /api/v1/publico/*  →  Rate Limit 30r/min      │
├──────────────────────────────┴───────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────────────────────────┐  ┌──────────────────────────────┐ │
│   │      PHOENIX BACKEND (Elixir)       │  │    REACT FRONTEND (TypeScript) │ │
│   │                                     │◄─►│                              │ │
│   │  Hexagonal Architecture             │WS│  Clean Architecture          │ │
│   │  ┌────────────────────────────────┐ │  │  ┌────────────────────────┐ │ │
│   │  │  🏛️ DOMAIN (Lógica pura)      │ │  │  │  domain/ (Funciones)   │ │ │
│   │  │  - Entidades (structs inmutables)│ │  │  │  - result.ts (Monad)   │ │ │
│   │  │  - FSM, Event Sourcing, ROP     │ │  │  │  - entidades/*         │ │ │
│   │  │  - Tree Walker (recursión TCO)  │ │  │  │  - higher-order/       │ │ │
│   │  ├────────────────────────────────┤ │  │  ├────────────────────────┤ │ │
│   │  │  🔌 PORTS (Contratos)          │ │  │  │  application/          │ │ │
│   │  │  - Input: behaviours casos uso │ │  │  │  - ports/ (interfaces) │ │ │
│   │  │  - Output: behaviours repos     │ │  │  │  - use-cases/ (HOF)   │ │ │
│   │  ├────────────────────────────────┤ │  │  ├────────────────────────┤ │ │
│   │  │  🔧 ADAPTERS                   │ │  │  │  streams/ (RxJS)      │ │ │
│   │  │  - Repos: 11 repos + soft delete│ │  │  │  - operators/         │ │ │
│   │  │  - Cache: Redis (cache/locks)  │ │  │  │  - composite/         │ │ │
│   │  │  - Email: Oban workers         │ │  │  ├────────────────────────┤ │ │
│   │  ├────────────────────────────────┤ │  │  │  hooks/               │ │ │
│   │  │  🎭 USE CASES                  │ │  │  │  - useObservable      │ │ │
│   │  │  - CheckIn, CheckOut, Saga     │ │  │  │  - useHabitacionRepo  │ │ │
│   │  │  - Venta Producto, Limpieza     │ │  │  ├────────────────────────┤ │ │
│   │  └────────────────────────────────┘ │  │  │  components/ + pages/  │ │ │
│                                       │  │  └────────────────────────┘ │ │
│   Web Layer:                           │  │                              │ │
│   ┌──────────────────────────────────┐ │  │                              │ │
│   │  Controllers (CQRS) + Channels   │ │  │                              │ │
│   │  - 13 controllers REST            │ │  │                              │ │
│   │  - 4 channels WebSocket          │ │  │                              │ │
│   │  - 9 plugs de seguridad           │ │  │                              │ │
│   └──────────────────────────────────┘ │  │                              │ │
│   └─────────────────────────────────────┘  └──────────────────────────────┘  │
│                                                                               │
│   ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│   │  PostgreSQL  │  │    Redis     │  │   Prometheus    │  │    Grafana      │  │
│   │      18      │  │      8       │  │   + Alerting   │  │   + Loki Logs   │  │
│   └──────────────┘  └──────────────┘  └────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Flujo de capas (Hexagonal Backend)

```
Solicitud HTTP
     │
     ▼
  Router.ex (pipeline: api → auth → admin_only)
     │
     ▼
  Controller (comando/query CQRS)
     │
     ▼
  UseCase / Saga (lógica de negocio pura)
     │
     ├──► Port.Input (comportamiento, interfaz)
     │         │
     │         ▼
     │    Port.Output (contratos de infraestructura)
     │         │
     │    ┌────┴──────────────────────────────────────┐
     │    ▼                                           ▼
     │ Adapter.Repo (implementación concretas)    Adapter.Cache (Redis)
     │ (PostgreSQL + Ecto)                        (Redix)
     │
     ▼
  Channel (suscrito a PubSub)
     │
     ▼
  WebSocket → RxJS Stream → React Component
```

---

## 🔭 Observable Repository Pattern

El **Observable Repository** es la innovación central del sistema. Compara la diferencia fundamental:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    PATTERN COMPARISON                                         ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Repository Tradicional:                                                      ║
║  ┌──────────────┐         GET /habitaciones                                   ║
║  │  Component   │────────►  Server                    ──► Devuelve Promise     ║
║  │              │◄──────── Response una vez          ──► Se renderiza         ║
║  └──────────────┘              ⛔ Nunca más actualizaciones                     ║
║                                                                               ║
║  Observable Repository:                                                       ║
║  ┌──────────────┐         GET /habitaciones       ┌───────────────────────┐  ║
║  │  Component   │────────►  Server                │  Otro usuario cambia   │  ║
║  │              │◄──────── Promise → valor         │  estado habitación     │  ║
║  │  [SUBSCRIBE] │                                   └──────────┬────────────┘  ║
║  │              │◄──────── WS: "habitacion_update"           │              ║
║  │              │◄──────── WS: "reserva_update"              │              ║
║  │  [RE-RENDER] │         scan(acumular, valorAnterior)      ▼              ║
║  │              │◄──────── Observable<Result>                ┌──────────┐   ║
║  │              │         ┌─────────────────────────┐      │ PubSub   │   ║
║  │              │◄────────│ ✅ Re-render automático  │◄─────│ broadcast│   ║
║  └──────────────┘         └─────────────────────────┘      └──────────┘   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Implementación — Backend (Elixir)

Cada repositorio implementa el behaviour `ObservableRepository` y hace broadcast tras cada mutación:

```elixir
# ports/output.ex — contrato del pattern
defmodule HotelFlux.Ports.Output.ObservableRepository do
  @callback topic_cambios() :: String.t()
  @callback broadcast_cambio(tipo_evento :: String.t(), payload :: map()) :: :ok
  @callback suscribir_cambios(opts :: map()) :: :ok | {:error, term()}
end

# adapters/repos/habitacion_repo.ex — implementación
defmodule HotelFlux.Adapters.Repos.HabitacionRepo do
  @topic_cambios "habitaciones"   # topic único por agregado

  def cambiar_estado(id, nuevo_estado) do
    with {:ok, habitacion} <- obtener(id),
         {:ok, changeset} <- Habitacion.cambiar_estado(habitacion, nuevo_estado),
         {:ok, updated}   <- Repo.update(changeset) do
      # Observable Repository: broadcast tras mutación exitosa
      broadcast_cambio("habitacion_actualizada", serialize(updated))
      {:ok, updated}
    end
  end

  def broadcast_cambio(tipo_evento, payload) do
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, @topic_cambios, {
      String.to_atom(tipo_evento), payload
    })
  end

  # Función PURA: serialización para el payload del evento
  defp serialize(%Habitacion{} = h) do
    %{id: h.id, numero: h.numero, piso: h.piso,
      tipo: h.tipo, estado: h.estado, capacidad: h.capacidad}
  end
end
```

### Implementación — Frontend (TypeScript + RxJS)

```typescript
// services/repositories/habitacion.repository.ts
class HabitacionObservableRepository implements IHabitacionRepository {
  private cache$ = new BehaviorSubject<Result<Habitacion[]>>({ ok: true, value: [] });

  listar$(filtros?: FiltrosHabitacion): Observable<Result<Habitacion[]>> {
    // Paso 1: carga inicial REST
    const initial$ = from(apiListar(filtros)).pipe(
      tap(res => { if (res.ok) this.cache$.next(res); })
    );

    // Paso 2: stream de actualizaciones WebSocket
    const updates$ = createMultiEventStream('habitaciones:lobby', [
      'mapa_completo', 'habitacion_actualizada', 'estado_actualizado', 'nuevo_estado'
    ]).pipe(
      scan(acumularEventos, this.cache$.getValue()),  // fold inmutable
    );

    // Paso 3: merge — emite tanto carga inicial como cada cambio posterior
    return merge(initial$, updates$).pipe(shareReplay(1));
  }
}

// hooks/useObservableRepository.ts — bridge Observable → React
export function useHabitacionRepository(filtros?: FiltrosHabitacion) {
  const [state, setState] = useState<Result<Habitacion[]>>({ ok: true, value: [] });

  useEffect(() => {
    const repo = getOrCreateRepository(getAuthToken());
    const sub = repo.listar$(filtros).subscribe(setState);
    return () => sub.unsubscribe();
  }, [filtros]);

  return state;
}
```

### Tabla de Topics PubSub

| Repositorio | Topic PubSub | Topic WS | Eventos |
|---|---|---|---|
| `HabitacionRepo` | `"habitaciones"` | `habitaciones:lobby` | `habitacion_creada`, `habitacion_actualizada`, `mapa_completo` |
| `ReservaRepo` | `"reservas"` | `hotel:lobby` | `reserva_creada`, `reserva_actualizada`, `reserva:update` |
| `TareaRepo` | `"limpieza"` | `hotel:lobby` | `tarea_asignada`, `limpieza:update` |

### Flujo completo de datos

```
Usuario cambia estado habitación
         │
         ▼
[Controller] → [UseCase] → HabitacionRepo.cambiar_estado/2
                                 │
                      {:ok, updated} ← Repo.update(changeset)
                                 │
                      broadcast_cambio("habitacion_actualizada", serialize(updated))
                                 │
                                 ▼
                      Phoenix.PubSub.broadcast("habitaciones", ...)
                                 │
                    ┌────────────┴────────────┐
                    ▼                          ▼
          HabitacionChannel              Workers / Analytics
          (suscrito via                  (otros procesos)
           suscribir_cambios/1)
                    │
             push(socket, ...)
                    │
                    ▼  (WebSocket)
          createMultiEventStream("habitaciones:lobby", [...])
                    │
             scan(acumularEventos, estadoAnterior)
                    │
                    ▼
          Observable<Result<Habitacion[]>> emite nuevo valor
                    │
                    ▼
          useHabitacionRepository() → React re-render automático
```

---

## 🧬 Patrones Demostrados

### Programación Funcional — Backend (Elixir)

| # | Patrón | Implementación | Archivo |
|---|---|---|---|
| 1 | **Funciones puras** | Entidades como structs inmutables con funciones de transformación | `domain/habitacion.ex` |
| 2 | **Inmutabilidad** | Datos como `@module_attribute`; nunca se mutan structs | `domain/transitions.ex` |
| 3 | **Pattern Matching** | Desestructuración, guards, cláusulas de función en todo el código | `domain/*.ex`, controllers |
| 4 | **Pipe Operator** | `\|>` en toda la base de código para composición funcional | `use_cases/*.ex` |
| 5 | **Higher-Order Functions** | `Enum.map/2`, `Enum.filter/2`, `Enum.reduce/3`; funciones que retornan funciones | `domain/pipeline.ex` |
| 6 | **Recursión TCO** | BFS para rutas en FSM; fold recursivo para reconstrucción de estado | `domain/state_machine.ex`, `domain/tree_walker.ex` |
| 7 | **Result Monad (ROP)** | Railway Oriented Programming: `{:ok, v}` / `{:error, e}` en pipeline | `domain/result.ex`, `domain/combinators.ex` |
| 8 | **FSM (State Machine)** | Tabla de transiciones inmutable como module attribute; función pura `transicion/3` | `domain/state_machine.ex`, `domain/transitions.ex` |
| 9 | **Event Sourcing** | `reconstruir_estado/2` con TCO; proyecciones con HOF reductor | `domain/event_sourcing.ex` |
| 10 | **Tree Traversal** | Recursión sobre árbol Hotel→Pisos→Habitaciones con variantes TCO | `domain/tree_walker.ex` |
| 11 | **Ports & Adapters** | `@behaviour` + `@callback` para input/output del dominio | `ports/input.ex`, `ports/output.ex` |
| 12 | **Soft Delete** | Eliminación lógica con `eliminado: true` + `eliminado_en` en las 11 entidades | `adapters/repos/*.ex` |

### Programación Reactiva — Frontend (RxJS + React)

| # | Patrón | Implementación | Archivo |
|---|---|---|---|
| 1 | **Observable Repository** | Repositorios que devuelven `Observable<Result<T>>` en vez de `Promise<T>` | `services/repositories/*.ts` |
| 2 | **merge(initial$, updates$)** | Unión de carga inicial REST con stream de actualizaciones WebSocket | `habitacion.repository.ts` |
| 3 | **scan como fold** | `scan(acumularEventos, estadoInicial)` — acumulación de estado inmutable | Todos los repositories |
| 4 | **shareReplay(1)** | Un solo WebSocket compartido entre todos los suscriptores React | `services/repositories/index.ts` |
| 5 | **BehaviorSubject como caché** | Siempre emite el último valor a nuevos suscriptores | Todos los repositories |
| 6 | **Hot Observables** | `shareReplay` para multicasting; `asHotWithReplay()` como operador HOF | `streams/operators/index.ts` |
| 7 | **Backpressure** | `withBackpressure`, `slidingWindow(60)`, `adaptiveThrottle` como operadores HOF | `streams/operators/index.ts` |
| 8 | **Retry exponencial** | `retryWithExponentialBackoff(3, 1000)` con jitter | `streams/operators/index.ts` |
| 9 | **combineLatest** | Estado global compuesto: 4 streams fuentes → `EstadoGlobal` derivado | `streams/composite/hotel-state.stream.ts` |
| 10 | **Bridge Observable→React** | `useObservableRepository` conecta streams RxJS con `useState` | `hooks/useObservableRepository.ts` |
| 11 | **14 operadores custom HOF** | Funciones `T → OperatorFunction<T,T>` que retornan funciones | `streams/operators/index.ts` |

### Programación Funcional — Frontend (TypeScript)

| # | Patrón | Implementación | Archivo |
|---|---|---|---|
| 1 | **pipe / compose** | Composición izquierda-derecha y derecha-izquierda | `domain/higher-order/index.ts` |
| 2 | **Currying** | Aplicación parcial: `filtrarPor(prop)(valor)(lista)` | `domain/higher-order/index.ts` |
| 3 | **Result Monad** | `ok/err`, `mapResult`, `flatMapResult`, `fold` (ROP) | `domain/result.ts` |
| 4 | **Inmutabilidad** | `readonly`, `Readonly<T>`, `as const` en todo el dominio | `domain/entidades/*.ts` |
| 5 | **Recursión TCO** | `aplanarEventos(acc)`, `reconstruirEstado(acc)` con acumulador | `domain/pure/recursion.ts` |
| 6 | **HOF predicados** | `todosLosPredicados([...])`, `algunPredicado([...])`, `negar` | `domain/higher-order/index.ts` |
| 7 | **Design Tokens** | Sistema de diseño como constantes tipadas (`as const`) | `design-tokens.ts` |

### Arquitectura

| Patrón | Descripción | Ubicación |
|---|---|---|
| **Hexagonal Architecture** | Backend: puertos input/output, adaptadores, dominio desacoplado | `ports/`, `adapters/`, `domain/` |
| **Clean Architecture** | Frontend: domain → application → streams → hooks → components | `src/` (frontend) |
| **CQRS** | Separación comandos (escritura) y queries (lectura) en API | `controllers/`, `services/api.ts` |
| **Event Sourcing** | Tabla `eventos_dominio`, reconstrucción con `reconstruir_estado/2` (TCO) | `domain/event_sourcing.ex` |
| **Saga Pattern** | Reservas con 5 pasos y compensación automática | `use_cases/saga/` |
| **Observer / PubSub** | Phoenix PubSub → Channels → RxJS Observables | `channels/`, `streams/` |
| **Factory memoizada** | `createRepositories(token)` — una instancia por token | `services/repositories/index.ts` |

---

## ⚡ Bloqueante vs No-Bloqueante

### Diferencia Fundamental

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    MODELO BLOQUEANTE (tradicional)                            ║
║                                                                                ║
║  Request HTTP → Thread/Otro proceso espera → Database Query                   ║
║                         │                                                      ║
║                         ▼                                                      ║
║              ════════════════════════════════════════                        ║
║              El hilo SE BLOQUEA esperando la respuesta                         ║
║              ════════════════════════════════════════                        ║
║                         │                                                      ║
║                         ▼                                                      ║
║              Response → Thread liberado                                       ║
║                                                                                ║
║  PROBLEMA: Con 1000 usuarios concurrentes, necesito 1000 threads            ║
║  → Alto consumo de memoria → Context switching overhead → Latencia            ║
╚═══════════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════════╗
║                 MODELO NO-BLOQUEANTE (HotelFlux)                               ║
║                                                                                ║
║  Request HTTP → Event Loop (Elixir BEAM) → Database Query                    ║
║                         │                                                      ║
║                         ▼                                                      ║
║              ════════════════════════════════════════                         ║
║              El proceso ENVÍA mensaje y SE REGISTRA para callback             ║
║              ════════════════════════════════════════                         ║
║                         │                                                      ║
║                         ▼                                                      ║
║              Proceso sigue atendiendo otros requests                          ║
║                         │                                                      ║
║              ┌───────────┴───────────────┐                                      ║
║              ▼                           ▼                                    ║
║     Request #2                   Request #3                                    ║
║     (sin esperar)                (sin esperar)                                ║
║                         │                                                      ║
║              ┌─────────▼─────────────┐                                          ║
║              ▼                     ▼                                           ║
║        DB retorna           DB retorna                                        ║
║              │                     │                                            ║
║              └──────────┬──────────┘                                            ║
║                         ▼                                                      ║
║              Process mailbox → callback → response                           ║
║                                                                                ║
║  VENTAJA: Un proceso atende miles de conexiones concurrentes                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Implementación en HotelFlux

| Componente | Tipo | Implementación |
|---|---|---|
| **Backend (Elixir)** | No-bloqueante | BEAM OTP: procesos lightweight, mensajes asíncronos, `GenServer` |
| **Web Server (Phoenix)** | No-bloqueante | `Bandit` (Plug adapter) + Cowboy conhandler no-bloqueante |
| **Database (Ecto)** | No-bloqueante | `Repo.all(async: true)` + `Ecto.Async` para queries paralelas |
| **Redis Cache** | No-bloqueante | `Redix` (async driver) + `Redix.Protocol` para pipelines |
| **WebSockets** | No-bloqueante | `Phoenix.Channel` con `socket.assigns` + PubSub |
| **Background Jobs** | No-bloqueante | `Oban` (Producers → Workers asíncronos) |
| **Frontend (RxJS)** | No-bloqueante | `Observable` no bloquea UI; eventos asíncronos via `subscribe` |

### Código: Ecto Async (Backend)

```elixir
# Queries concurrentes NO bloqueantes
defmodule HotelFlux.Adapters.Repos.AnaliticaRepo do
  import Ecto.Query

  def obtener_dashboard_async(hotel_id) do
    # Tres queries paralelas usando Ecto.Async
    ocupacion_task = Task.async(fn -> calcular_ocupacion(hotel_id) end)
    ingresos_task = Task.async(fn -> calcular_ingresos(hotel_id) end)
    reservas_task = Task.async(fn -> contar_reservas(hotel_id) end)

    # Espera no-bloqueante de los tres resultados
    %{ocupacion: Task.await(ocupacion_task),
      ingresos: Task.await(ingresos_task),
      reservas: Task.await(reservas_task)}
  end

  defp calcular_ocupacion(hotel_id) do
    Repo.one(
      from h in Habitacion,
      where: h.hotel_id == ^hotel_id,
      select: count(*) filter (where h.estado == "ocupada")
    )
  end
end
```

### Código: RxJS Non-Blocking (Frontend)

```typescript
// Frontend: Observable NO bloquea la UI
// El componente se suscribe y continúa siendo interactivo
class HabitacionObservableRepository {
  listar$(filtros?: FiltrosHabitacion): Observable<Result<Habitacion[]>> {
    return from(api.listar(filtros)).pipe(
      // tap es efecto secundario que NO bloquea el stream
      tap(res => {
        if (res.ok) this.cache$.next(res);
      }),
      // retry es reintento asíncrono
      retry({ count: 3, delay: 1000 }),
      shareReplay(1)
    );
  }
}

// El hook NO bloquea el renderizado
export function useHabitacionRepository(filtros?: FiltrosHabitacion) {
  const [state, setState] = useState<Result<Habitacion[]>>({ ok: true, value: [] });

  useEffect(() => {
    const repo = getOrCreateRepository(getAuthToken());
    // Subscription es ASÍNCRONA - la UI sigue responsive
    const sub = repo.listar$(filtros).subscribe(setState);
    return () => sub.unsubscribe(); // Cleanup no-bloqueante
  }, [filtros]);

  return state; // UI renderiza "loading" mientras datos vienen
}
```

---

## 🕐 Schedulers: `asyncScheduler` y `queueScheduler`

RxJS proporciona schedulers para controlar **cuándo** y **dónde** se ejecutan las emisiones de un Observable. HotelFlux utiliza schedulers implícitamente a través de operadores que los consumen internamente.

### Schedulers Disponibles en RxJS

| Scheduler | Comportamiento | Uso en HotelFlux |
|---|---|---|
| **queueScheduler** | Ejecuta en la cola actual (microtask) antes de cualquier callback asíncrono | Operadores como `delay`, `debounceTime` para procesamiento inmediato |
| **asyncScheduler** | Ejecuta con `setTimeout` (macro task) | Operadores como `interval`, `timer` |
| **asapScheduler** | Ejecuta en microtask (promises) | Transformaciones síncronas rápidas |
| **animationFrameScheduler** | Ejecuta antes del paint del navegador | Animaciones |

### Uso Implícito en HotelFlux

Los siguientes operadores de RxJS utilizan `asyncScheduler` y `queueScheduler` internamente:

```typescript
// streams/operators/index.ts
// El operador delay usa asyncScheduler internamente
export function retryWithExponentialBackoff(
  count: number = 3,
  delayMs: number = 1000
): OperatorFunction<unknown, unknown> {
  return (source$) =>
    source$.pipe(
      retry({
        count,
        delay: (error, retryCount) =>
          // delay internally uses asyncScheduler para ejecutar el reintento
          timer(delayMs * Math.pow(2, retryCount)).pipe(
            tap(() => console.log(`Reintento ${retryCount}`))
          )
      })
    );
}

// debounceTime usa queueScheduler (ejecuta en microtask queue)
export function withBackpressure<T>(maxBuffer: number = 100) {
  return (source$: Observable<T>) =>
    source$.pipe(
      debounceTime(100),  // queueScheduler: espera a que la cola se vacíe
      bufferCount(maxBuffer)  // Limita emisiones a maxBuffer
    );
}
```

### Comparación de Schedulers

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    COMPARACIÓN DE SCHEDULERS                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  FLUJO DE EJECUCIÓN (simplificado):                                           ║
║                                                                               ║
║  ┌──────────────────┐                                                        ║
║  │ Call Stack       │ ← Código síncrono actual                             ║
║  └────────┬─────────┘                                                        ║
║           │                                                                   ║
║           ▼                                                                   ║
║  ┌──────────────────┐                                                        ║
║  │ Microtask Queue  │ ← Promises, queueScheduler, asapScheduler           ║
║  │ (priority alta)  │   → Se ejecuta ANTES de setTimeout                    ║
║  └────────┬─────────┘                                                        ║
║           │                                                                   ║
║           ▼                                                                   ║
║  ┌──────────────────┐                                                        ║
║  │ Macrotask Queue  │ ← setTimeout, setInterval, asyncScheduler            ║
║  │ (priority baja)  │   → Se ejecuta DESPUÉS de microtasks                 ║
║  └────────┬─────────┘                                                        ║
║           │                                                                   ║
║           ▼                                                                   ║
║  ┌──────────────────┐                                                        ║
║  │ Render (Browser)│ ← animationFrameScheduler                              ║
║  └──────────────────┘                                                        ║
║                                                                               ║
║  EJEMPLO:                                                                     ║
║                                                                               ║
║  import { queueScheduler, asyncScheduler } from 'rxjs';                     ║
║                                                                               ║
║  // queueScheduler: ejecuta INMEDIATAMENTE después del código síncrono      ║
║  of(1, 2, 3).pipe(observeOn(queueScheduler)).subscribe(console.log);        ║
║                                                                               ║
║  // asyncScheduler: ejecuta DESPUÉS (setTimeout 0)                          ║
║  of(1, 2, 3).pipe(observeOn(asyncScheduler)).subscribe(console.log);        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Configuración Custom en HotelFlux

```typescript
// streams/operators/index.ts - Scheduler personalizado
import { asyncScheduler, queueScheduler, SchedulerAction, SchedulerLike } from 'rxjs';

export const customScheduler: SchedulerLike = {
  schedule(
    work: (this: SchedulerAction<unknown>, state?: unknown) => void,
    delay: number = 0,
    state?: unknown
  ) {
    // Comportamiento híbrido: usa queue para delays = 0, async para delays > 0
    if (delay <= 0) {
      queueScheduler.schedule(work, 0, state);
    } else {
      return asyncScheduler.schedule(work, delay, state);
    }
  }
};
```

---

## 📜 El Manifiesto Reactivo

El **Manifiesto Reactivo** (Reactive Manifesto) define los principios de sistemas reactivos. HotelFlux implementa los cuatro pilares:

### Los 4 Pilares

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      LOS 4 PILARES DEL MANIFIESTO REACTIVO                    ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ╭─────────────────────────────────────────────────────────────────────╮     ║
║   │                    1. RESPONSIVO (Responsive)                       │     ║
║   │                                                                     │     ║
║   │   "El sistema responde a tiempo"                                   │     ║
║   │                                                                     │     ║
║   │   HotelFlux → Re-render automático en <100ms tras cambio           │     ║
║   │   │─ useObservableRepository() → React re-render                  │     ║
║   │   │─ WebSocket → scan() → setState() en tiempo real                │     ║
║   │   │─ Health checks Prometheus/Grafana (< 2s SLA)                  │     ║
║   ╰─────────────────────────────────────────────────────────────────────╯     ║
║                                    │                                         ║
║   ╭─────────────────────────────────────────────────────────────────────╮     ║
║   │                    2. RESILIENTE (Resilient)                       │     ║
║   │                                                                     │     ║
║   │   "El sistema responde incluso ante fallos"                        │     ║
║   │                                                                     │     ║
║   │   HotelFlux →                                                         │     ║
║   │   │─ Supervisor OTP: restart automático de procesos caídos          │     ║
║   │   │─ retryWithExponentialBackoff(3, 1000) reintentos en frontend   │     ║
║   │   │─ Redis cache fallback si BD no responde                         │     ║
║   │   │─ Oban workers: jobs con reintento automático                    │     ║
║   │   │─ Saga Pattern: compensación ante fallo de paso                  │     ║
║   ╰─────────────────────────────────────────────────────────────────────╯     ║
║                                    │                                         ║
║   ╭─────────────────────────────────────────────────────────────────────╮     ║
║   │                    3. ELÁSTICO (Elastic)                          │     ║
║   │                                                                     │     ║
║   │   "El sistema responde a cambios de carga"                          │     ║
║   │                                                                     │     ║
║   │   HotelFlux →                                                         │     ║
║   │   │─ BEAM: miles de procesos lightweight en un solo VM             │     ║
║   │   │─ Oban: workers escalan según cola de jobs                       │     ║
║   │   │─ Redis: sliding window rate limiting adaptativo                │     ║
║   │   │─ Docker: auto-scaling en producción (configurable)             │     ║
║   │   │─ Prometheus: métricas para scaling decisions                  │     ║
║   ╰─────────────────────────────────────────────────────────────────────╯     ║
║                                    │                                         ║
║   ╭─────────────────────────────────────────────────────────────────────╮     ║
║   │                    4. Orientado a MENSAJES (Message-Driven)       │     ║
║   │                                                                     │     ║
║   │   "Los componentes interactúan via mensajes asíncronos"            │     ║
║   │                                                                     │     ║
║   │   HotelFlux →                                                         │     ║
║   │   │─ Phoenix PubSub: broadcast asíncrono entre procesos           │     ║
║   │   │─ Phoenix Channels: WebSocket → mensajes async                  │     ║
║   │   │─ RxJS Observables: streams push-based asíncronos               │     ║
║   │   │─ Oban: jobs en cola (message queue)                             │     ║
║   │   │─ GenServer: patrón request/response async                      │     ║
║   ╰─────────────────────────────────────────────────────────────────────╯         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Mapping: HotelFlux → Pilares del Manifiesto

| Pilar | HotelFlux - Implementación | Archivo/Componente |
|---|---|---|
| **Responsivo** | UI reactiva con RxJS `scan()`, `combineLatest` | `streams/*.stream.ts`, `hooks/*.ts` |
| **Resiliente** | Supervisor OTP, retry exponencial, Saga compensation | `backend/lib/hotelflux/application.ex`, `streams/operators/index.ts` |
| **Elástico** | BEAM procesos lightweight, Oban workers, Docker | `backend/mix.exs`, `docker-compose.prod.yml` |
| **Message-Driven** | Phoenix PubSub, Channels, RxJS, GenServer | `channels/*.ex`, `streams/*.stream.ts`, `ports/*.ex` |

---

## 🔄 Paradigma Funcional vs Imperativo

### Comparación Conceptual

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║              PARADIGMA IMPERATIVO vs FUNCIONAL                                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  IMPERATIVO                                FUNCIONAL                          ║
║  ════════════════════════════              ════════════════════════════════  ║
║                                                                               ║
║  • "CÓMO" hacer (pasos)                 • "QUÉ" hacer (resultado)            ║
║  • Estado mutable                       • Estado inmutable                  ║
║  • Efectos secundarios visibles         • Funciones puras                   ║
║  • Secuencia de instrucciones           • Composición de funciones          ║
║  • loops, mutaciones                    • map, filter, reduce               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Código Side-by-Side: Backend (Elixir)

```elixir
# ═══════════════════════════════════════════════════════════════════════════════
# IMPERATIVO (tradicional, NO usado en HotelFlux)
# ═══════════════════════════════════════════════════════════════════════════════
defmodule ReporteImperativo do
  def generar_reporte(habitaciones) do
    reporte = []  # Estado mutable (lista vacía)

    # Loop imperativo con mutación
    for h <- habitaciones do
      if h.estado == "ocupada" do
        reporte = reporte ++ [%{habitacion: h.numero, precio: h.precio}]
      end
    end

    total = 0
    for r <- reporte do
      total = total + r.precio  # Mutación de variable
    end

    %{reporte: reporte, total: total}
  end
end

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCIONAL (HotelFlux - ENTIDADES PUHAS)
# ═══════════════════════════════════════════════════════════════════════════════
defmodule HotelFlux.Domain.Habitacion do
  defstruct [:id, :numero, :piso, :tipo, :estado, :precio, :capacidad]

  # Función PURA: misma entrada → siempre misma salida
  def habitacion_ocupada?(%__MODULE__{estado: estado}), do: estado == "ocupada"

  # Función PURA: transforma sin mutar (retorna nueva estructura)
  def calcular_precio(%__MODULE__{precio: precio, tipo: tipo}) do
    case tipo do
      "suite" -> precio * 1.5
      "estandar" -> precio
      _ -> precio * 1.2
    end
  end

  # Función PURA: pipeline de transformación
  def reporte_ocupadas(habitaciones) do
    habitaciones
    |> Enum.filter(&habitacion_ocupada?/1)           # HOF: filter (puro)
    |> Enum.map(fn h -> %{                          # HOF: map (puro)
      habitacion: h.numero,
      precio: calcular_precio(h)
    end)
    |> Enum.reduce(0, fn r, acc -> r.precio + acc end)  # fold (puro)
  end

  # Función PURA: cambio de estado INMUTABLE (retorna nueva instancia)
  def cambiar_estado(habitacion, nuevo_estado) do
    %{habitacion | estado: nuevo_estado}  # syntax sugar: crea nuevo map
  end
end
```

### Código Side-by-Side: Frontend (TypeScript)

```typescript
// ═══════════════════════════════════════════════════════════════════════════════
// IMPERATIVO (tradicional, NO usado en HotelFlux)
// ═══════════════════════════════════════════════════════════════════════════════
function generarReporteImperativo(habitaciones: Habitacion[]): Reporte {
  const reporte: ReporteItem[] = [];

  // Loop con mutación de array
  for (let i = 0; i < habitaciones.length; i++) {
    const h = habitaciones[i];
    if (h.estado === 'ocupada') {
      reporte.push({ habitacion: h.numero, precio: h.precio });
    }
  }

  // Mutación de variable
  let total = 0;
  for (const r of reporte) {
    total = r.precio + total;
  }

  return { reporte, total };
}

// Estado mutable - PROHIBIDO en HotelFlux
let cacheGlobal: Habitacion[] = [];
function actualizarCache(nuevasHabitaciones: Habitacion[]) {
  cacheGlobal = nuevasHabitaciones;  // Mutación directa - NO funcional
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONAL (HotelFlux - Dominio Puro)
// ═══════════════════════════════════════════════════════════════════════════════
import { pipe } from './domain/higher-order';
import { ok, map, fold } from './domain/result';

// Funciones PURAS (sin efectos secundarios)
const habitacionOcupada = (h: Habitacion): boolean => h.estado === 'ocupada';

const calcularPrecio = (h: Habitacion): number => {
  const multiplicadores = { suite: 1.5, estandar: 1, estandar_plus: 1.2 };
  return h.precio * (multiplicadores[h.tipo] || 1.2);
};

const toReporteItem = (h: Habitacion): ReporteItem => ({
  habitacion: h.numero,
  precio: calcularPrecio(h)
});

// Función PURA: compose de funciones (HOF)
const reporteOcupadas = (habitaciones: Habitacion[]): Result<Reporte, string> =>
  ok(habitaciones)
    .pipe(
      map(pipe(
        filter(habitacionOcupada),
        map(toReporteItem),
        fold(0, (acc, r) => acc + r.precio)
      )),
      map(total => ({ reporte: habitaciones.filter(habitacionOcupada).map(toReporteItem), total }))
    );

// Estado INMUTABLE - usando Readonly y Object.freeze conceptual
type HabitacionReadonly = Readonly<Habitacion>;

// BehaviorSubject con copia inmutable
class HabitacionRepository {
  private cache$ = new BehaviorSubject<Result<Habitacion[]>>({ ok: true, value: [] });

  // update retorna NUEVO estado, no muta el existente
  private update(data: Habitacion[]): void {
    this.cache$.next({ ok: true, value: [...data] });  // Spread operator: nueva referencia
  }
}
```

### Comparación de Propiedades

|属性 | Imperativo | Funcional (HotelFlux) |
|---|---|---|
| **Estado** | Mutable (`variable = newValue`) | Inmutable (`{...obj, newField}`) |
| **Efectos secundarios** | Visibles (funciones que modifican globales) |aislados (solo en adapters, no en dominio) |
| **Composición** | Secuencia de pasos (`step1(); step2()`) | Pipelines (`value \|> f1 \|> f2 \|> f3`) |
| **Testing** | Difícil (依赖 de estado global) | Fácil (funciones puras → easy assertions) |
| **Concurrencia** | Difícil (estado compartido = race conditions) | Fácil (datos inmutables = thread-safe) |
| **Ejemplo real** | ❌ No usado | ✅ `domain/habitacion.ex`, `domain/result.ex`, `higher-order/index.ts` |

---

## 🔀 Concurrencia BEAM (Elixir)

### Procesos Lightweight y Message Passing

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    BEAM VM - CONCURRENCIA EN HOTELFLUX                          ║
║                                                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐   ║
║  │                         BEAM VIRTUAL MACHINE (Erlang)                   │   ║
║  │                                                                          │   ║
║  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌───────────┐   │   ║
║  │   │   PHOENIX   │   │   GEN_SERVER│   │   GEN_SERVER│   │  OBAN    │   │   ║
║  │   │   (HTTP)    │   │ (Habitacion)│   │  (Reserva)  │   │ (Workers)│   │   ║
║  │   │  ~500 bytes │   │   ~2 KB     │   │   ~2 KB     │   │  ~1 KB    │   │   ║
║  │   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └─────┬─────┘   │   ║
║  │          │                │                │                │          │   ║
║  │          │      ══════════╧═════════════════╧═══════════════│          │   ║
║  │          │                MESSAGE PASSING (asíncrono)      │          │   ║
║  │          │      ════════════════════════════════════════════│          │   ║
║  │          │                                                  │          │   ║
║  │          ▼                                                  ▼          │   ║
║  │   ┌─────────────────────────────────────────────────────────────────┐   │   ║
║  │   │                      PROCESS MAILBOX                            │   │   ║
║  │   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │   ║
║  │   │   │mensaje 1 │ │mensaje 2 │ │mensaje 3 │ │mensaje N │        │   │   ║
║  │   │   └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │   ║
║  │   └─────────────────────────────────────────────────────────────────┘   │   ║
║  │                                                                          │   ║
║  │  1 proceso BEAM = ~2KB de RAM | 1 millón de procesos = ~2GB            │   ║
║  │  vs 1 thread OS = ~1MB (500x más pesado)                               │   ║
║  └─────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Flujo de Procesos en HotelFlux

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    FLUJO DE CONCURRENCIA - CREAR RESERVA                        ║
║                                                                                ║
║  Request HTTP POST /api/v1/reservas                                            ║
║       │                                                                        ║
║       ▼                                                                        ║
║  ┌─────────────────────────────────────────────────────────────────────────┐   ║
║  │ PROCESO 1: Phoenix Endpoint (HTTP Handler)                             │   ║
║  │ • Recibe request, valida headers, parse JSON                            │   ║
║  │ • Envía mensaje al proceso Use Case                                    │   ║
║  └───────────────────────────────┬─────────────────────────────────────────┘   ║
║                                  │                                             ║
║                                  ▼                                             ║
║  ┌─────────────────────────────────────────────────────────────────────────┐   ║
║  │ PROCESO 2: ReservaSaga (Use Case - GenServer)                          │   ║
║  │ • Orkestral: coordina 5 pasos                                          │   ║
║  │ • No bloquea: envía mensajes y espera respuestas                     │   ║
║  │                                                                          │   ║
║  │   ├─→ Proceso 3: HabitacionRepo (valida disponibilidad)               │   ║
║  │   ├─→ Proceso 4: RedisCache (distributed lock)                         │   ║
║  │   ├─→ Proceso 5: ReservaRepo (persiste)                                │   ║
║  │   ├─→ Proceso 6: PagoService (mock payment)                           │   ║
║  │   └─→ Proceso 7: PubSub (broadcast)                                    │   ║
║  └───────────────────────────────┬─────────────────────────────────────────┘   ║
║                                  │                                             ║
║              ┌───────────────────┼───────────────────┐                         ║
║              ▼                   ▼                   ▼                         ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 ║
║  │ PROCESO 3       │  │ PROCESO 5       │  │ PROCESO 7       │                 ║
║  │ HabitacionRepo  │  │ ReservaRepo     │  │ Phoenix.PubSub  │                 ║
║  │   (PostgreSQL)  │  │   (PostgreSQL)  │  │   (broadcast)   │                 ║
║  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                 ║
║           │                    │                    │                         ║
║           │                    │                    │                         ║
║           ▼                    ▼                    ▼                         ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 ║
║  │   PostgreSQL    │  │   PostgreSQL    │  │  PROCESO 8      │                 ║
║  │  (Ecto Repo)    │  │  (Ecto Repo)    │  │  Channel WS    │                 ║
║  └─────────────────┘  └─────────────────┘  └────────┬────────┘                 ║
║                                                   │                          ║
║                                                   ▼                          ║
║                                          ┌─────────────────┐                 ║
║                                          │  RxJS Stream    │                 ║
║                                          │  (Frontend)     │                 ║
║                                          └─────────────────┘                 ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Supervisor Tree

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    SUPERVISOR TREE - HOTELFLUX                                  ║
║                                                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐   ║
║  │  hotelflux_app (Application)                                           │   ║
║  │  ═══════════════════════════════════════════════════════════════════    │   ║
║  │                                                                          │   ║
║  │  ┌─────────────────────────┐                                           │   ║
║  │  │  HotelFlux.Repo (DB)    │ ← PostgreSQL via Ecto                    │   ║
║  │  └─────────────────────────┘                                           │   ║
║  │                                                                          │   ║
║  │  ┌─────────────────────────────────────────────────────────────────┐    │   ║
║  │  │  HotelFlux.PubSub (Phoenix.PubSub)                             │    │   ║
║  │  │  • "habitaciones" topic                                        │    │   ║
║  │  │  • "reservas" topic                                            │    │   ║
║  │  │  • "limpieza" topic                                            │    │   ║
║  │  └─────────────────────────────────────────────────────────────────┘    │   ║
║  │                                                                          │   ║
║  │  ┌─────────────────────────┐                                           │   ║
║  │  │  Oban (Background Jobs)│ ← Workers asíncronos                     │   ║
║  │  │  • EmailWorker         │   (reintentos, persistencia)            │   ║
║  │  │  • LimpiezaTimeoutWorker                                         │   ║
║  │  └─────────────────────────┘                                           │   ║
║  │                                                                          │   ║
║  │  ┌─────────────────────────────────────────────────────────────────┐    │   ║
║  │  │  Endpoint (Phoenix HTTP)                                        │    │   ║
║  │  │  • 13 Controllers (REST)                                       │    │   ║
║  │  │  • 4 Channels (WebSocket)                                      │    │   ║
║  │  │  • 9 Plugs (Security)                                          │    │   ║
║  │  └─────────────────────────────────────────────────────────────────┘    │   ║
║  │                                                                          │   ║
║  │  ┌─────────────────────────┐                                           │   ║
║  │  │  Redis Cache            │ ← Redix client (async)                  │   ║
║  │  │  • Rate limiting        │   (locks, cache, blacklist)             │   ║
║  │  └─────────────────────────┘                                           │   ║
║  │                                                                          │   ║
║  └─────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
║  Si un proceso falla → Supervisor reinicia automáticamente                     ║
║  (One-For-One strategy en workers, All-For-One en crítico)                    ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔐 Seguridad — OWASP Top 10 (2021) + ISO 27001

### OWASP Top 10 — Mapeo Completo

```
┌────┬──────────────────────────────┬───────────────────────────────────────────┬──────────────────┐
│ ID │ Riesgo                        │ Control implementado                      │ Archivo          │
├────┼──────────────────────────────┼───────────────────────────────────────────┼──────────────────┤
│ A01│ Broken Access Control         │ RBAC + JWT + Role Guards (backend+front) │ router.ex, App   │
│ A02│ Cryptographic Failures        │ Bcrypt 12R + HTTPS + Secure Cookies      │ auth_controller  │
│ A03│ Injection                     │ Sanitization Plug + Ecto Parameterized    │ input_sanit_plug │
│ A04│ Insecure Design               │ Rate Limiting + Account Lockout           │ rate_limit_plug  │
│ A05│ Security Misconfiguration     │ Security Headers Plug (CSP, HSTS, etc.)   │ security_hdr_plug│
│ A06│ Vulnerable Components         │ Dependencias pinned + Alpine minimal      │ Dockerfile       │
│ A07│ Identification & Auth Failures│ NIST 800-63B + JWT HTTP-only             │ auth_controller  │
│ A08│ Software & Data Integrity     │ Soft Delete + Event Sourcing              │ domain/*.ex      │
│ A09│ Security Logging & Monitoring │ AuditLogPlug + Loki + Grafana             │ audit_log_plug   │
│ A10│ Server-Side Request Forgery   │ Validación endpoints + no user URLs       │ router.ex        │
└────┴──────────────────────────────┴───────────────────────────────────────────┴──────────────────┘
```

### Request Pipeline de Seguridad

```
Request HTTP
      │
      ▼
 [1] RequestId (Telemetry)        ─── Trazabilidad + correlación
      │
      ▼
 [2] SecurityHeadersPlug          ─── A05: CSP Level 3, HSTS 1 año,
      │                                X-Frame-Options DENY, COEP/COOP/CORP,
      │                                Permissions-Policy (camera, mic, geo bloqueados)
      │
      ▼
 [3] AuditLogPlug                 ─── A09: ISO 27001 A.12.4 structured logging
      │                                (método, path, status, IP, user_id, duración)
      │
      ▼
 [4] Body Parser (8MB limit)       ─── A04: protección payload excesivo
      │
      ▼
 [5] CORS (origins explícitos)     ─── A05: solo orígenes permitidos
      │
      ▼
 [6] InputSanitizationPlug         ─── A03: regex contra XSS, SQLi, Command Injection
      │                                (9 patrones peligrosos, límite 10K chars/campo)
      │
      ▼
 [7] RateLimitPlug (por pipeline)  ─── A04: Redis sliding window por IP
      │                                (Auth: 10/min, Público: 30/min, Global: 120/min)
      │
      ▼
 [8] AuthPlug + RolePlug           ─── A01+A07: JWT + RBAC verification
      │
      ▼
 [9] Controller / Business Logic
```

### ISO 27001 — Controles Implementados

| Anexo | Control | Cobertura | Implementación |
|---|---|---|---|
| **A.5.1** | Políticas de seguridad | 100% | Plugs, password policy, rate limits |
| **A.8.1** | Inventario de activos | 100% | Docker images versionadas, lockfiles |
| **A.9.1** | Control de acceso | 100% | RBAC 4 roles, guards frontend+backend |
| **A.9.2** | Gestión de acceso | 100% | Registro, soft delete, admin gestiona |
| **A.9.3** | Responsabilidades usuario | 100% | Password NIST 800-63B, lockout 5 intentos |
| **A.9.4** | Control acceso sistema | 100% | JWT HTTP-only, token blacklist Redis |
| **A.10.1** | Controles criptográficos | 100% | Bcrypt 12R, HTTPS, cookies Secure+SameSite |
| **A.12.1** | Procedimientos operacionales | 95% | Docker Compose, Makefile, healthchecks |
| **A.12.4** | Logging y monitoreo | 95% | AuditLogPlug → Loki, Prometheus, Grafana |
| **A.12.6** | Gestión vulnerabilidades | 90% | OWASP Top 10, dependencias pinned |
| **A.13.1** | Seguridad de red | 90% | Nginx, rate limiting multi-capa, CORS restrictivo |
| **A.14.1** | Requisitos de seguridad | 100% | Validación en system boundary (plugs) |
| **A.14.2** | Desarrollo seguro | 95% | Hexagonal, tests ExUnit+Vitest, non-root containers |
| **A.18.1** | Cumplimiento legal | 100% | Ley N° 29733 (Perú), ARCO, Libro de Reclamaciones |

---

## 🔄 Flujo Reactivo en Tiempo Real

### Arquitectura de streams completa

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO REACTIVO COMPLETO                                │
│                                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │ Postgres │──►│  Repo    │──►│ PubSub   │──►│ Channel  │──►│  WebSocket│     │
│  │  (BD)    │   │ (Ecto)   │   │Broadcast │   │(Phoenix) │   │ (Bandit)  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘     │
│                                                                     │           │
│  ┌──────────────────────────────────────────────────────────────────▼───────┐    │
│  │                         FRONTEND (React + RxJS)                       │    │
│  │                                                                      │    │
│  │  websocket.stream.ts                                                │    │
│  │       createChannelStream()                                        │    │
│  │             │                                                        │    │
│  │             ▼                                                        │    │
│  │  createMultiEventStream("habitaciones:lobby", [...])                │    │
│  │             │                                                        │    │
│  │             ▼                                                        │    │
│  │  scan(acumularEventos, estadoAnterior)  ← fold inmutable (HOF)     │    │
│  │             │                                                        │    │
│  │             ▼                                                        │    │
│  │  Observable<Result<Habitacion[]>>                                   │    │
│  │             │                                                        │    │
│  │  ┌──────────┴────────────────────────────┐                          │    │
│  │  ▼                                    ▼                               │    │
│  │ useHabitacionRepository()      useReservaRepository()               │    │
│  │ (BehaviorSubject cache)         (BehaviorSubject cache)              │    │
│  │             │                           │                             │    │
│  │             ▼                           ▼                             │    │
│  │  RecepcionPage ↔ Mapa de habitaciones     ReservasPage               │    │
│  │  (re-render automático)                   (re-render automático)       │    │
│  │                                                                      │    │
│  │  combineLatest(stream1$, stream2$, stream3$, stream4$)               │    │
│  │             │                                                        │    │
│  │             ▼                                                        │    │
│  │  EstadoGlobal (derived state — чистая композиция)                    │    │
│  │             │                                                        │    │
│  │             ▼                                                        │    │
│  │  DashboardPage (KPIs reactivos, gráficas Recharts actualizadas)     │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  Redis (8)                                                                       │
│  ├── Cache: métricas dashboard (TTL 30s), info hotel (TTL 1h)                   │
│  ├── Rate Limiting: sliding window por IP + endpoint                            │
│  ├── Distributed Locks: reserva Saga (10s TTL)                                   │
│  └── Token Blacklist: logout + renovación JWT                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎭 Saga Pattern — Reserva con Compensación

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         SAGA: CREAR RESERVA (5 PASOS)                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  PASO 1: Validar disponibilidad                                                ║
║  ┌─────────────┐     ┌───────────────────┐     ┌──────────────────┐          ║
║  │ Habitacion  │────►│ buscar_disponible │────►│ ¿Hay habitación? │          ║
║  │ Repo         │     │ (fecha_entrada,   │     │                  │          ║
║  │              │     │  fecha_salida)    │     │     SÍ           │          ║
║  └─────────────┘     └───────────────────┘     └────────┬─────────┘          ║
║                                                          │ NO                  ║
║                                                       ┌──▼──────────┐          ║
║                                                       │ COMPENSAR:  │          ║
║                                                       │ Abortar saga│          ║
║                                                       └─────────────┘          ║
║  PASO 2: Bloquear habitación (Redis distributed lock, 10s TTL)                  ║
║  ┌─────────────┐     ┌───────────────────┐     ┌──────────────────┐          ║
║  │ Redis Lock  │────►│ Redix.setnx       │────►│ ¿Lock adquirido? │          ║
║  │             │     │ ("reserva:{id}")  │     │                  │          ║
║  └─────────────┘     └───────────────────┘     └────────┬─────────┘          ║
║                                                          │ NO                  ║
║                                                       ┌──▼──────────┐          ║
║                                                       │ COMPENSAR:  │          ║
║                                                       │ release lock │          ║
║                                                       └─────────────┘          ║
║  PASO 3: Crear reserva en BD                                                   ║
║  ┌─────────────┐     ┌───────────────────┐     ┌──────────────────┐          ║
║  │ Reserva     │────►│ Repo.insert       │────►│ ¿Reserva creada?  │          ║
║  │ Repo         │     │ (changeset)      │     │                  │          ║
║  └─────────────┘     └───────────────────┘     └────────┬─────────┘          ║
║                                                          │ ERROR               ║
║                                                       ┌──▼──────────┐          ║
║                                                       │ COMPENSAR:  │          ║
║                                                       │ release lock │          ║
║                                                       └─────────────┘          ║
║  PASO 4: Registrar pago                                                        ║
║  ┌─────────────┐     ┌───────────────────┐     ┌──────────────────┐          ║
║  │ PagoService │────►│ procesar          │────►│ ¿Pago exitoso?    │          ║
║  │             │     │ (monto, método)    │     │                  │          ║
║  └─────────────┘     └───────────────────┘     └────────┬─────────┘          ║
║                                                          │ FALLA              ║
║                                                       ┌──▼──────────┐          ║
║                                                       │ COMPENSAR:  │          ║
║                                                       │ - release lock│          ║
║                                                       │ - soft_delete │          ║
║                                                       │   reserva     │          ║
║                                                       └─────────────┘          ║
║  PASO 5: Notificar (PubSub broadcast + Oban EmailWorker)                       ║
║  ┌─────────────┐     ┌───────────────────┐                                    ║
║  │ PubSub      │────►│ broadcast         │                                    ║
║  │             │     │ ("reserva_creada")│                                    ║
║  └─────────────┘     └────────┬──────────┘                                    ║
║                                │                                                ║
║                    ┌───────────┴───────────┐                                    ║
║                    ▼                       ▼                                     ║
║          Oban EmailWorker         Channel → WS → RxJS                          ║
║          (async, con reintentos)  (progress bar Saga en UI)                     ║
║                                                                                ║
║                         ✅ RESERVA COMPLETADA                                   ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🗂️ Estructura del Proyecto

```
funcionalreactiva/
│
├── README.md                          # Este archivo
├── ARCHITECTURE.md                     # Documentación arquitectónica detallada
├── .env.example                        # Variables de entorno (copiar a .env)
├── .gitignore
├── Makefile                           # Comandos rápidos (make dev, make test, etc.)
├── docker-compose.yml                 # Desarrollo local (full stack)
├── docker-compose.prod.yml             # Despliegue VPS con monitoreo
│
├── nginx/
│   └── nginx.conf                      # Reverse proxy + rate limiting + OWASP headers
│
├── infra/                             # Monitoreo y observabilidad
│   ├── prometheus/
│   │   ├── prometheus.yml             # Scraping config + service discovery
│   │   ├── alert_rules.yml            # Alertas (respuesta >2s, errores 4xx/5xx)
│   │   └── recording_rules.yml        # Agregaciones pre-computadas
│   ├── loki/
│   │   ├── loki-config.yml            # Agregador de logs (7d retención)
│   │   └── promtail-config.yml        # Recolector → Loki
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/datasource.yml  # Auto-provisioning datasource
│       │   └── dashboards/dashboard.yml   # Auto-provisioning dashboards
│       └── dashboards/
│           ├── hotelflux-main.json     # Dashboard principal (KPIs, ocupación)
│           ├── hotelflux-hotel.json    # Dashboard hotel (habitaciones, reservas)
│           ├── hotelflux-system.json  # Dashboard sistema (cpu, mem, request/sec)
│           └── hotelflux-logs.json    # Dashboard logs (Loki)
│
├── backend/                           # === ELIXIR/PHOENIX API ===
│   ├── mix.exs                        # Dependencias: Phoenix, Ecto, Guardian, Oban...
│   ├── mix.lock
│   ├── Dockerfile                     # Multi-stage build (Elixir 1.17 slim)
│   ├── config/
│   │   ├── config.exs                # Desarrollo
│   │   ├── prod.exs                  # Producción (Redis, HTTPS)
│   │   └── test.exs                  # Tests (sandbox DB)
│   ├── lib/
│   │   ├── hotelflux/                # === CORE: lógica de negocio ===
│   │   │   │
│   │   │   ├── domain/               # Lógica pura (sin efectos secundarios)
│   │   │   │   ├── habitacion.ex         # Entidad + FSM + soft delete + Event Sourcing
│   │   │   │   ├── reserva.ex            # Entidad + soft delete
│   │   │   │   ├── huesped.ex            # Entidad + soft delete
│   │   │   │   ├── producto.ex           # Entidad + soft delete
│   │   │   │   ├── usuario.ex            # Entidad + OWASP password validation
│   │   │   │   ├── piso.ex               # Gestión de pisos
│   │   │   │   ├── turno.ex              # Turnos laborales
│   │   │   │   ├── horario_personal.ex   # Horarios/asistencia
│   │   │   │   ├── tarea_limpieza.ex     # Entidad + soft delete
│   │   │   │   ├── pago.ex               # Entidad + soft delete
│   │   │   │   ├── consumo.ex            # Entidad + soft delete
│   │   │   │   ├── events.ex             # Eventos de dominio (Event Sourcing)
│   │   │   │   │
│   │   │   │   ├── result.ex             # Result monad — ROP (Railway Oriented Programming)
│   │   │   │   ├── combinators.ex        # ROP combinators: map_ok, flat_map_ok, validate_with
│   │   │   │   ├── pipeline.ex           # HOF: compose, pipe, parcial, memoize (TCO)
│   │   │   │   ├── state_machine.ex      # FSM genérica: transicion/3, existe_ruta?/3 (BFS recursivo)
│   │   │   │   ├── transitions.ex        # Tablas FSM de dominio (module attributes inmutables)
│   │   │   │   ├── event_sourcing.ex     # reconstruir_estado/2 (TCO), proyectar/3 (HOF reductor)
│   │   │   │   └── tree_walker.ex        # Tree traversal: pre-order, in-order, level-order (TCO)
│   │   │   │
│   │   │   ├── ports/                  # Contratos (interfaces/behaviours)
│   │   │   │   ├── input.ex            # Behaviours de entrada: HabitacionPort, ReservaPort...
│   │   │   │   ├── output.ex           # Behaviours de salida: repos, cache, notificaciones
│   │   │   │   ├── habitacion_port.ex   # Puerto de entrada para habitaciones
│   │   │   │   ├── reserva_port.ex      # Puerto de entrada para reservas
│   │   │   │   ├── notificacion_port.ex # Puerto de salida para notificaciones
│   │   │   │   └── pago_port.ex         # Puerto de salida para pagos
│   │   │   │
│   │   │   ├── use_cases/              # Casos de uso (orquestación de lógica)
│   │   │   │   ├── checkin_use_case.ex      # Check-in: validar → actualizar → notificar → Event Sourcing
│   │   │   │   ├── checkout_use_case.ex     # Check-out: validar → actualizar → notificar → Event Sourcing
│   │   │   │   ├── asignar_limpieza_use_case.ex  # Asignar tarea + PubSub broadcast
│   │   │   │   ├── venta_producto_use_case.ex    # Venta: producto → consumo → actualizar
│   │   │   │   └── saga/
│   │   │   │       └── reserva_saga.ex     # Saga de 5 pasos con compensación
│   │   │   │
│   │   │   ├── adapters/              # Implementaciones concretas de los ports
│   │   │   │   ├── repos/             # 11 repositorios con Observable Repository
│   │   │   │   │   ├── habitacion_repo.ex     # + broadcast_cambio, serialize (pura)
│   │   │   │   │   ├── reserva_repo.ex        # + Observable Repository (PubSub)
│   │   │   │   │   ├── huesped_repo.ex
│   │   │   │   │   ├── producto_repo.ex
│   │   │   │   │   ├── usuario_repo.ex
│   │   │   │   │   ├── piso_repo.ex
│   │   │   │   │   ├── turno_repo.ex
│   │   │   │   │   ├── horario_repo.ex
│   │   │   │   │   ├── tarea_repo.ex          # + Observable Repository (PubSub)
│   │   │   │   │   ├── consumo_repo.ex
│   │   │   │   │   └── analitica_repo.ex      # Queries analíticas (agregaciones SQL)
│   │   │   │   ├── cache/
│   │   │   │   │   └── redis_cache.ex    # Redix: cache + rate limit + locks + blacklist
│   │   │   │   ├── email/
│   │   │   │   │   └── email_service.ex  # Envío de emails (mock/real)
│   │   │   │   └── pagos/
│   │   │   │       └── pago_service.ex   # Procesamiento de pagos (mock)
│   │   │   │
│   │   │   ├── events/                # Eventos de dominio (Event Sourcing)
│   │   │   │   ├── reserva_creada.ex
│   │   │   │   ├── checkin_realizado.ex
│   │   │   │   ├── checkout_realizado.ex
│   │   │   │   ├── habitacion_liberada.ex
│   │   │   │   ├── limpieza_asignada.ex
│   │   │   │   ├── limpieza_completada.ex
│   │   │   │   └── producto_vendido.ex
│   │   │   │
│   │   │   ├── workers/               # Oban background jobs
│   │   │   │   ├── email_worker.ex    # Envío de emails con reintentos (3 max, exponential backoff)
│   │   │   │   └── limpieza_timeout_worker.ex  # Alerta si tarea de limpieza > 45 min
│   │   │   │
│   │   │   ├── guardian.ex            # JWT: encoding, decoding, verification
│   │   │   ├── repo.ex                # Ecto.Repo (configuración central)
│   │   │   └── release.ex             # Scripts de migración y seed
│   │   │
│   │   └── hotelflux_web/             # === WEB: controllers, channels, plugs ===
│   │       ├── endpoint.ex            # Configuración del endpoint Phoenix
│   │       ├── router.ex              # Rutas + pipelines de seguridad (9 plugs)
│   │       ├── telemetry.ex           # Métricas Telemetry (Phoenix + Ecto + Oban)
│   │       ├── channels/              # Phoenix Channels (WebSocket)
│   │       │   ├── habitacion_channel.ex  # Suscrito a "habitaciones" PubSub
│   │       │   ├── hotel_channel.ex      # Lobby: habitaciones + reservas + limpieza
│   │       │   ├── limpieza_channel.ex   # Canal dedicado a tareas de limpieza
│   │       │   └── user_socket.ex        # Define UserSocket + transports
│   │       ├── controllers/           # 13 controllers (CQRS: commands + queries)
│   │       │   ├── auth_controller.ex    # Login, logout, registro, renovar, perfil
│   │       │   ├── admin_controller.ex   # CRUD admin: pisos, personal, horarios, analítica, exportar CSV
│   │       │   ├── habitacion_controller.ex  # CRUD + cambiar estado
│   │       │   ├── reserva_controller.ex      # Crear, cancelar (dispara Saga)
│   │       │   ├── checkin_controller.ex     # Realizar check-in
│   │       │   ├── checkout_controller.ex    # Realizar check-out
│   │       │   ├── producto_controller.ex   # Vender, crear
│   │       │   ├── tarea_controller.ex      # Actualizar estado tareas
│   │       │   ├── huesped_controller.ex    # Crear, actualizar
│   │       │   ├── query_controller.ex      # Queries CQRS: listar, obtener
│   │       │   ├── publico_controller.ex   # API pública: clientes sin auth
│   │       │   ├── health_controller.ex    # Health checks
│   │       │   └── metrics_controller.ex    # Prometheus metrics
│   │       ├── plugs/                 # 9 plugs de middleware
│   │       │   ├── auth_pipeline.ex      # JWTen cookie HTTP-only + token blacklist
│   │       │   ├── role_plug.ex          # RBAC: verifica rol contra pipeline
│   │       │   ├── auth_error_handler.ex # Manejo de errores de autenticación
│   │       │   ├── rate_limit_plug.ex    # Redis sliding window por IP
│   │       │   ├── input_sanitization_plug.ex  # Regex contra XSS, SQLi, Command Injection
│   │       │   ├── security_headers_plug.ex   # CSP, HSTS, X-Frame, COEP/COOP/CORP
│   │       │   ├── audit_log_plug.ex     # Structured logging ISO 27001 A.12.4
│   │       │   └── request_id_plug.ex    # Trazabilidad + correlación
│   │       └── views/
│   │           └── error_json.ex         # Renderizado de errores JSON
│   │
│   ├── priv/
│   │   ├── repo/
│   │   │   ├── migrations/           # 9 migraciones: habitaciones, reservas, huéspedes,
│   │   │   │                        # usuarios, pisos, turnos, horarios, tareas, pagos
│   │   │   └── seeds.exs            # 5 usuarios demo, pisos, habitaciones, productos
│   │   └── static/                   # Assets estáticos (favicon, etc.)
│   │
│   └── test/
│       ├── domain/
│       │   ├── state_machine_test.exs   # Tests FSM + BFS existe_ruta?
│       │   ├── result_test.exs           # Tests ROP + monad laws
│       │   ├── tree_walker_test.exs      # Tests tree traversal + TCO
│       │   └── combinators_test.exs      # Tests ROP combinators
│       ├── adapters/
│       │   ├── repos/                   # Tests repos con mock Repo (sandbox)
│       │   └── cache/                   # Tests Redis cache
│       ├── channels/                    # Tests Phoenix Channels
│       ├── workers/                    # Tests Oban workers
│       └── support/
│           ├── test_helpers.exs
│           └── conn_case.ex
│
└── frontend-reception/                # === REACT 19 + TYPESCRIPT + RXJS ===
    ├── package.json                  # React 19, RxJS 7.8, Tailwind v4, Recharts 2.15
    ├── tsconfig.json
    ├── vite.config.ts                # Vitest config
    ├── Dockerfile                   # Multi-stage: Node 23 → Nginx
    ├── index.html
    │
    └── src/
        │
        ├── design-tokens.ts          # Sistema de diseño luxury: colores, tipografía, spacing
        │                             # (const as const: CLASE_ESTADO, BRAND, FONT...)
        │
        ├── domain/                   # Lógica pura (sin efectos secundarios)
        │   ├── types.ts              # Re-export centralizado de todas las entidades
        │   ├── result.ts             # Result<T,E> monad — ROP en TypeScript
        │   ├── entidades/            # 9+ archivos de entidad (interfaces readonly)
        │   │   ├── habitacion.ts     # + CLASE_ESTADO Tailwind, funciones puras (calcular precio, clasificar)
        │   │   ├── reserva.ts
        │   │   ├── huesped.ts
        │   │   ├── producto.ts
        │   │   ├── tarea.ts
        │   │   └── ...
        │   ├── higher-order/
        │   │   └── index.ts         # HOF: pipe, compose, filtrarPor, agruparPor, memoize,
        │   │                         # todosLosPredicados, algunPredicado, negar, siCondicion, tap
        │   └── pure/
        │       ├── index.ts          # Funciones puras: precios con IGV, ocupación, filtros (curried)
        │       └── recursion.ts      # Algoritmos recursivos + TCO: aplanar, recorrer, reconstruir, agruparEnChunks
        │
        ├── application/              # Casos de uso + puertos (Clean Architecture)
        │   ├── ports/
        │   │   └── index.ts         # Interfaces: IHabitacionRepository, IReservaRepository,
        │   │                         # IHuespedRepository, IProductoRepository, ITareaRepository
        │   └── use-cases/
        │       └── index.ts         # Casos de uso HOF con inyección funcional
        │
        ├── streams/                  # RxJS Observable Streams
        │   ├── websocket.stream.ts   # createChannelStream, createMultiEventStream (Phoenix Channel → Observable)
        │   ├── habitacion.stream.ts  # acumularHabitaciones, ordenarHabitaciones (HOF curried)
        │   ├── reserva.stream.ts     # Stream de reservas
        │   ├── limpieza.stream.ts    # Stream de tareas de limpieza
        │   ├── dashboard.stream.ts   # combineLatest de streams → estado compuesto
        │   ├── notificacion.stream.ts # Stream de notificaciones
        │   ├── commands.stream.ts    # Streams de comandos (check-in, check-out, reserva)
        │   ├── combined.stream.ts    # combineLatest + withAutoRetry operator
        │   ├── operators/
        │   │   └── index.ts         # 14 operadores RxJS custom como HOF:
        │   │                         # withBackpressure, adaptiveThrottle, slidingWindow,
        │   │                         # asHotWithReplay, retryWithExponentialBackoff,
        │   │                         # withAutoRetry, scanLast, toResult, delayWhile,
        │   │                         # throttleAfter, onCacheHit, createMultiEventStream
        │   └── composite/
        │       └── hotel-state.stream.ts  # 4 streams → EstadoGlobal (combineLatest)
        │
        ├── hooks/                    # Bridge Observable → React
        │   ├── useObservable.ts          # Hook genérico: Observable → useState
        │   ├── useObservableRepository.ts  # Hook genérico repositorio
        │   ├── useHabitacionStream.ts   # HabitacionObservableRepository → React state
        │   ├── useReservaStream.ts      # ReservaObservableRepository → React state
        │   ├── useLimpiezaStream.ts     # TareaRepository → React state
        │   ├── useDashboardStream.ts    # combineLatest → KPIs Reactivos
        │   ├── useCombinedStream.ts     # combineLatest genérico
        │   ├── useNotificaciones.ts     # Stream de notificaciones
        │   ├── useAuth.tsx              # Contexto de autenticación (JWT cookie → state)
        │   └── useSystemHealth.ts      # Health check polling
        │
        ├── services/                  # API clients + repositories
        │   ├── api.ts                  # CQRS client: commands() + queries() + offline fallback
        │   ├── admin.api.ts            # API admin tipada
        │   ├── publico.api.ts          # API pública para huéspedes
        │   ├── repositories/
        │   │   ├── index.ts           # createRepositories(token) factory memoizada
        │   │   ├── habitacion.repository.ts  # Observable Repository: listar$, obtener$,
        │   │   ├── reserva.repository.ts     # Observable Repository: listar$, activas$, crearSaga
        │   │   ├── tarea.repository.ts       # Observable Repository: listar$, asignar$, completar$
        │   │   └── habitacion.repository.ts.bak  # Backup antes de Observable Repository
        │   ├── mock-data.ts           # Datos mock para desarrollo offline
        │   ├── mock-store.ts          # Mock store para desarrollo offline
        │   └── security.ts           # Utilidades OWASP: sanitizeHtml, validatePassword,
        │                               # generateNonce, buildCspDirectives, sanitizeUrl, etc.
        │
        ├── components/                # Componentes React
        │   ├── shared/
        │   │   ├── Layout.tsx         # Layout admin: sidebar navy + header + content
        │   │   ├── ClienteLayout.tsx  # Layout público: navbar scroll + footer + cookie consent
        │   │   ├── CookieConsent.tsx  # Banner consentimiento Ley 29733 (3 categorías)
        │   │   ├── Icons.tsx         # SVG icons (Lucide-style)
        │   │   ├── LoadingSpinner.tsx
        │   │   ├── Modal.tsx
        │   │   ├── Pagination.tsx
        │   │   └── RoleGuard.tsx     # Protección por rol (React)
        │   ├── habitaciones/
        │   │   ├── MapaHabitaciones.tsx   # Mapa SVG por pisos, colores CLASE_ESTADO
        │   │   ├── HabitacionCard.tsx      # Card con estado + acciones rápidas
        │   │   └── LeyendaEstados.tsx      # Leyenda de colores
        │   ├── dashboard/
        │   │   ├── KPICards.tsx           # 4 KPIs: ocupación, ingresos, reservas, limpieza
        │   │   ├── OcupacionChart.tsx     # Gráfica ocupación
        │   │   └── AccionesRapidas.tsx    # Acciones por rol
        │   ├── reservas/
        │   │   ├── ReservaForm.tsx       # Formulario creación reserva (3 pasos)
        │   │   ├── ReservaLista.tsx       # Lista filtrable de reservas
        │   │   ├── SagaProgress.tsx       # Progress bar Saga pattern
        │   │   └── CheckInOutModal.tsx    # Modal check-in/check-out
        │   ├── productos/
        │   │   ├── ProductoCatalogo.tsx   # Catálogo con búsqueda
        │   │   └── VentaModal.tsx        # Modal venta con cantidad
        │   ├── limpieza/
        │   │   ├── TareaLista.tsx        # Lista mobile-first filtrable
        │   │   └── TareaCard.tsx         # Card táctil
        │   └── notificaciones/
        │       └── NotificacionPanel.tsx # Panel de alertas en tiempo real
        │
        ├── pages/                    # Páginas (rutas)
        │   ├── LoginPage.tsx              # Login premium con protección anti-fuerza bruta
        │   ├── RegistroPage.tsx           # Registro de empleados
        │   ├── AccesoPage.tsx             # Acceso (redirect según rol)
        │   ├── DashboardPage.tsx          # KPIs + acciones rápidas + gráficos
        │   ├── RecepcionPage.tsx          # Mapa interactivo + reserva directa
        │   ├── ReservasPage.tsx           # Gestión de reservas
        │   ├── HuespedesPage.tsx          # Gestión de huéspedes
        │   ├── ProductosPage.tsx          # Catálogo + ventas
        │   ├── LimpiezaPage.tsx           # Tareas mobile-first
        │   ├── PersonalPage.tsx           # Gestión de empleados + turnos
        │   ├── AnaliticaPage.tsx          # Dashboard analítico (períodos, granularidad)
        │   ├── AuditoriaPage.tsx          # Timeline de eventos ISO 27001
        │   ├── ConfiguracionPage.tsx      # Configuración del sistema
        │   ├── PerfilPage.tsx             # Perfil del usuario
        │   ├── MiCuentaPage.tsx           # Mi cuenta
        │   │                               #
        │   ├── InicioPage.tsx             # Landing page luxury (huéspedes)
        │   ├── HabitacionesPublicoPage.tsx  # Catálogo público con búsqueda
        │   ├── ReservaClientePage.tsx    # Flujo de reserva (4 pasos)
        │   ├── ReservaClientePage.tsx.bak
        │   ├── ServiciosPage.tsx          # Catálogo de servicios públicos
        │   └── LegalPage.tsx             # Docs legales (privacidad, términos, cookies)
        │
        ├── App.tsx                  # Router + Auth context + Role guards + CSP
        ├── main.tsx                 # Entry point React 19
        ├── index.css               # Tailwind v4 + @theme (colores de estado, sistema luxury)
        └── types/
            └── phoenix.d.ts         # Tipos TypeScript para Phoenix Channels
```

---

## 🚀 Inicio Rápido

### Con Docker (Desarrollo Local)

```bash
# Clonar y levantar
git clone <repo-url>
cd funcionalreactiva
docker compose up -d

# Migraciones y seeds
docker compose exec backend ./bin/hotelflux eval 'HotelFlux.Release.migrate()'
docker compose exec backend ./bin/hotelflux eval 'HotelFlux.Release.seed()'

# Acceder
http://localhost           # Frontend
http://localhost:4000      # Backend API
http://localhost:3001      # Grafana (admin / HotelFlux2026!)
```

### Con Docker (Producción VPS)

```bash
cp .env.example .env
# Editar .env con secretos reales
docker compose -f docker-compose.prod.yml up -d
```

### Desarrollo Local (sin Docker)

**Backend:**
```bash
cd backend
mix deps.get
mix ecto.setup        # create + migrate + seed
mix phx.server        # http://localhost:4000
```

**Frontend:**
```bash
cd frontend-reception
npm install
npm run dev           # http://localhost:3000
npm run test          # Vitest unit tests
```

**Tests Backend:**
```bash
cd backend
mix test                    # Todos
mix test test/domain/      # Solo dominio
mix test --trace            # Verbose
```

---

## 👥 Roles y Acceso

| Rol | Vista Principal | Secciones Accedidas |
|---|---|---|
| **admin** | Dashboard | Todas: Dashboard, Recepción, Reservas, Huéspedes, Productos, Limpieza, **Personal**, **Analítica**, **Auditoría**, Configuración |
| **recepcionista** | Recepción | Dashboard, Recepción, Reservas, Huéspedes, Productos |
| **limpieza** | Limpieza | Solo Limpieza (mobile-first) |
| **mantenimiento** | Dashboard | Dashboard, Configuración |

### Credenciales Demo

| Usuario | Email | Password | Rol |
|---|---|---|---|
| Administrador | admin@hotelflux.com | Admin123! | admin |
| Recepcionista | recepcion@hotelflux.com | Recep123! | recepcionista |
| Gerente | ana@hotelflux.com | Gerente123! | admin |
| Limpieza | limpieza1@hotelflux.com | Limpieza123! | limpieza |
| Mantenimiento | manten1@hotelflux.com | Manten123! | mantenimiento |

> Las contraseñas cumplen OWASP: mínimo 8 caracteres + mayúscula + número + especial

---

## 📝 API Endpoints

### Endpoints Públicos (sin autenticación, rate limited)

```
POST /api/v1/auth/login              { email, password, remember_me? }
POST /api/v1/auth/registro          { nombre, email, password, rol }
```

### Endpoints Públicos — Clientes (rate limited 30/min)

```
GET  /api/v1/publico/info                          → Info hotel (cached 1h)
GET  /api/v1/publico/disponibilidad               → ?fecha_entrada, fecha_salida, tipo, capacidad
GET  /api/v1/publico/habitaciones/tipos            → Tipos con precios
POST /api/v1/publico/reservar                      → Crear reserva huésped (Saga)
GET  /api/v1/publico/reserva/:id                   → Consultar estado
GET  /api/v1/publico/servicios                    → Catálogo por categoría
GET  /api/v1/publico/legal/privacidad             → Política privacidad (Ley 29733)
GET  /api/v1/publico/legal/terminos                → Términos y condiciones
GET  /api/v1/publico/legal/cookies                → Política cookies
```

### Endpoints Protegidos (JWT requerido)

```
# Auth
POST /api/v1/auth/logout           PUT /api/v1/auth/perfil
POST /api/v1/auth/renovar          PUT /api/v1/auth/cambiar-password
GET  /api/v1/auth/perfil

# Comandos (CQRS — escritura)
POST /api/v1/reservas               PUT /api/v1/reservas/:id/cancelar
POST /api/v1/checkin                POST /api/v1/checkout
PUT  /api/v1/habitaciones/:id/estado  POST /api/v1/habitaciones
POST /api/v1/productos/venta        POST /api/v1/productos
PUT  /api/v1/tareas/:id/estado      POST /api/v1/huespedes  PUT /api/v1/huespedes/:id

# Queries (CQRS — lectura)
GET /api/v1/habitaciones            GET /api/v1/habitaciones/:id
GET /api/v1/reservas                GET /api/v1/reservas/:id
GET /api/v1/huespedes              GET /api/v1/huespedes/:id
GET /api/v1/productos              GET /api/v1/tareas
GET /api/v1/tareas/empleado/:id    GET /api/v1/consumos/reserva/:id
GET /api/v1/eventos                GET /api/v1/dashboard/metricas
GET /api/v1/dashboard/ocupacion    GET /api/v1/dashboard/ingresos
GET /api/v1/dashboard/top-productos
```

### Endpoints Admin (JWT + rol admin)

```
# Pisos
GET/POST/PUT/DELETE  /api/v1/admin/pisos

# Personal
GET/POST/PUT/DELETE  /api/v1/admin/personal
GET                   /api/v1/admin/personal/conteo

# Horarios
GET/POST              /api/v1/admin/horarios
POST                  /api/v1/admin/horarios/semana
GET                   /api/v1/admin/horarios/semana
GET                   /api/v1/admin/horarios/empleado/:id
PUT                   /api/v1/admin/horarios/:id/estado

# Turnos
GET                   /api/v1/admin/turnos

# Analítica (con período ?periodo=dia|semana|mes|trimestre|semestre|año)
GET                   /api/v1/admin/dashboard
GET                   /api/v1/admin/analitica/reservas
GET                   /api/v1/admin/analitica/ingresos
GET                   /api/v1/admin/analitica/productos
GET                   /api/v1/admin/analitica/habitaciones
GET                   /api/v1/admin/analitica/ocupacion

# Exportar CSV
GET                   /api/v1/admin/exportar/reservas
GET                   /api/v1/admin/exportar/ingresos
GET                   /api/v1/admin/exportar/personal
```

### WebSocket (Phoenix Channels)

| Topic | Eventos | Descripción |
|---|---|---|
| `habitaciones:lobby` | `mapa_completo`, `habitacion_actualizada`, `estado_actualizado`, `nuevo_estado` | Observable Repository — habitaciones |
| `hotel:lobby` | `reserva:update`, `limpieza:update`, `dashboard:metrics`, `notificacion:nueva` | Lobby multi-entidad |
| `limpieza:lobby` | `tarea_asignada`, `tarea_completada`, `limpieza:update` | Canal dedicado a limpieza |

---

## 🌐 Página Pública para Huéspedes

| Sección | Descripción |
|---|---|
| **Landing page** | Hero full-viewport, galería habitaciones, servicios, testimonios, CTA |
| **Búsqueda disponibilidad** | Por fechas, tipo, capacidad → resultados con precios en S/ |
| **Flujo de reserva** | 4 pasos: búsqueda → selección → datos → confirmación (código HF-XXXXXXXX) |
| **Consulta de reserva** | Huésped consulta estado con su código |
| **Catálogo servicios** | Agrupado por categoría (Room Service, Spa, WiFi, Tours...) |
| **Docs legales** | Política privacidad (Ley 29733), T&C, Cookies con accordion |
| **Cookie consent** | Banner con 3 categorías (esenciales/funcionales/analíticas) |

---

## 📊 Analytics Dashboard

- **KPIs tiempo real**: Ocupación %, Ingresos S/, Reservas, Limpieza avg
- **Gráficas Recharts**: Ingresos diarios, Reservas por estado, Top productos, Ventas por categoría
- **Períodos configurables**: Día, Semana, Mes, Trimestre, Semestre, Anual
- **Granularidad temporal**: DATE_TRUNC para ventas por día/semana/mes
- **Ocupación por tipo**: Desglose por tipo de habitación y estado
- **Ranking habitaciones**: Más usadas + ingresos por habitación
- **Caché Redis**: 30s con indicador visual (⚡ Caché / 🔄 BD)
- **Exportación CSV**: Descarga directa por sección

---

## 🐳 Docker Services

| Servicio | Imagen | Puerto | Descripción |
|---|---|---|---|
| **postgres** | postgres:18-alpine | 5432 | Base de datos con soft delete, índices parciales |
| **redis** | redis:8-alpine | 6379 | Cache, Rate Limit, Distributed Locks, Token Blacklist |
| **backend** | Elixir 1.17 multi-stage | 4000 | API REST + WebSocket + Admin + Pública |
| **frontend** | Node 23 → Nginx | 3000 | SPA React con Recharts + Página Clientes |
| **nginx** | nginx:alpine | 80/443 | Reverse proxy + WS + Rate Limiting + OWASP Headers |
| **prometheus** | prom/prometheus | 9090 | Métricas + Alert Rules |
| **grafana** | grafana/grafana | 3001 | Dashboards + Loki logs |
| **loki** | grafana/loki | — | Agregador logs (7d retención) |
| **promtail** | grafana/promtail | — | Recolector → Loki |

---

## 🛠️ Stack Tecnológico

### Backend

| Tecnología | Propósito |
|---|---|
| **Elixir 1.17** | Programación funcional con actores, procesos concurrentes |
| **Phoenix 1.7.18** | Framework web con Channels (WebSocket) y PubSub |
| **Bandit** | HTTP/1.1 server (sucesor de Cowboy) |
| **Ecto 3.12** | ORM funcional con changesets, queries composables |
| **Guardian 2.3** | JWT authentication con HTTP-only cookies |
| **Bcrypt 3.2** | Hashing de contraseñas (12 rounds) |
| **Oban 2.18** | Jobs en background con retry y scheduling |
| **Redix** | Cliente Redis para cache, locks, rate limiting |
| **PostgreSQL 18** | Base de datos relacional con soft delete |

### Frontend

| Tecnología | Propósito |
|---|---|
| **React 19** | UI declarativa con hooks y concurrent features |
| **TypeScript 5.7** | Tipado estático estricto |
| **RxJS 7.8** | Programación reactiva con Observables |
| **Tailwind CSS 4** | Utility-first con @theme inline |
| **Recharts 2.15** | Gráficas declarativas (Line, Bar, Pie, Area) |
| **Vite 6** | Build tool + HMR + Vitest |
| **date-fns 4.1** | Manipulación de fechas funcional |
| **React Router 7** | Enrutamiento SPA |
| **Phoenix Channels** | WebSocket client para tiempo real |

### Testing

| Tecnología | Propósito |
|---|---|
| **ExUnit** | Tests backend (15+ archivos: dominio, repos, router, channels, workers) |
| **Vitest** + **Testing Library** | Tests frontend (8+ archivos: hooks, API, componentes, dominio) |

---

## 📚 Conceptos Académicos Demostrados

### Programación Funcional — Elixir

| Concepto | Dónde se demuestra |
|---|---|
| Funciones puras | `domain/habitacion.ex`, `domain/result.ex` — sin efectos secundarios |
| Inmutabilidad | `@module_attribute` como constantes; structs nunca mutados |
| Pattern Matching | `with`, guards, cláusulas múltiples en todo el código |
| Pipe Operator | `\|>` en todos los use cases y controllers |
| Higher-Order Functions | `Enum.map/filter/reduce`, funciones que retornan funciones |
| Recursión TCO | `reconstruir_estado/2`, `existe_ruta?/3` (BFS), `agrupar_recursivo/2` |
| Result Monad (ROP) | `{:ok, v}` / `{:error, e}` en pipelines funcionales |
| State Machine (FSM) | `StateMachine.transicion/3`, tabla `@transiciones_validas` |
| Event Sourcing | `reconstruir_desde_eventos/2`, tabla `eventos_dominio` |
| Tree Traversal | `TreeWalker` con pre-order, in-order, level-order |
| Ports & Adapters | `@behaviour` en `ports/input.ex`, `ports/output.ex` |
| Observable Repository | `broadcast_cambio/2` en cada repo tras mutación |

### Programación Reactiva — RxJS

| Concepto | Dónde se demuestra |
|---|---|
| Observable Repository | `listar$()` devuelve `Observable<Result<T>>`, no `Promise<T>` |
| merge(initial$, updates$) | Carga REST + stream WebSocket fusionados |
| scan como fold | `scan(acumularEventos, estadoInicial)` — estado inmutable acumulado |
| shareReplay(1) | Un WebSocket compartido entre todos los componentes |
| BehaviorSubject | Caché reactivo que siempre emite el último valor |
| Hot Observables | `asHotWithReplay()` — multicasting a múltiples suscriptores |
| Backpressure | `withBackpressure`, `slidingWindow(60)`, `adaptiveThrottle` |
| Retry exponencial | `retryWithExponentialBackoff(3, 1000)` con jitter |
| combineLatest | 4 streams → `EstadoGlobal` derivado puramente |
| Bridge Observable→React | `useObservableRepository` conecta streams con `useState` |
| 14 operadores custom HOF | Funciones que retornan `OperatorFunction<T,T>` |

---

## 📋 Historias de Usuario

| ID | Historia | Criterios de Aceptación |
|---|---|---|
| **HU-01** | Autenticación Segura | Login email/password, JWT HTTP-only, remember me (7d), lockout 5 intentos, NIST 800-63B |
| **HU-02** | Gestión de Recepción en Tiempo Real | Mapa SVG por pisos, colores por estado, WebSocket push, panel detalle, modal reserva 3 pasos |
| **HU-03** | Crear Reserva con Saga | 5 pasos Saga, compensación automática, progress bar, evento de dominio |
| **HU-04** | Dashboard de Métricas | KPIs reactivos RxJS, gráficas Recharts, caché Redis 30s, exportar CSV |
| **HU-05** | Limpieza Mobile-First | Vista mobile, lista filtrable, cambio de estado con tap, timeout 45 min Oban |
| **HU-06** | Auditoría ISO 27001 | Timeline eventos, filtros, contadores KPI, panel OWASP, A.12.4 compliance |
| **HU-07** | Reserva Pública Huéspedes | Búsqueda por fechas/tipo/capacidad, precios S/, código confirmación, consulta estado |
| **HU-08** | Analítica Avanzada | Períodos día→año, granularidad temporal, ocupación por tipo, ranking habitaciones, ingresos por habitación |
| **HU-09** | Gestión de Personal | CRUD con soft delete, turnos, horarios semanales, control asistencia, conteo por rol |
| **HU-10** | Layout Responsivo RBAC | Sidebar filtrado por rol, hamburger móvil, breadcrumbs, overlay blur |
| **HU-11** | Cookie Consent Ley 29733 | 3 categorías, toggles, "Aceptar todas"/"Solo esenciales", localStorage, link política |
| **HU-12** | Observable Repository | Repos devuelven `Observable<Result<T>>` (stream nunca completa), broadcast PubSub → WS → scan → re-render |
| **HU-13** | Docs Legales Premium | 3 documentos, tabs navegación, accordion, tabla contenidos, badge Ley 29733 |
| **HU-14** | Landing Page Luxury | Hero full-viewport, glassmorphism stats, galería precios S/, testimonios, animaciones scroll |
| **HU-15** | Login Anti-Fuerza Bruta | Bloqueo 5 intentos (30s cooldown), toggle password, remember me, 4 botones demo, security badges |
| **HU-16** | Seguridad Frontend OWASP | sanitizeHtml, validatePassword, generateNonce, buildCspDirectives, sanitizeUrl, CSRF tokens |

---

## 🧪 Informe de Testing (IT)

### Estrategia de Testing

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    ESTRATEGIA DE TESTING - HOTELFLUX                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         ║
║  │   BACKEND       │    │   FRONTEND      │    │   E2E           │         ║
║  │   (Elixir)      │    │   (TypeScript)  │    │   (Vitest)      │         ║
║  │                 │    │                 │    │                 │         ║
║  │  ExUnit + Mox   │    │  Vitest + RTL   │    │  Playwright    │         ║
║  │  • Unit tests   │    │  • Unit tests   │    │  • Flows       │         ║
║  │  • Integration │    │  • Components   │    │  • Regression  │         ║
║  │  • Channel tests│    │  • Hooks        │    │                 │         ║
║  │  • Worker tests │    │  • Integration  │    │                 │         ║
║  └─────────────────┘    └─────────────────┘    └─────────────────┘         ║
║                                                                               ║
║  COBERTURA MÍNIMA: 80% (lógica de dominio: 95%+)                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Framework y Herramientas

| Capa | Framework | Herramientas | Configuración |
|---|---|---|---|
| **Backend** | ExUnit (Elixir) | `Mox` (mocks), `ExCheck` (property-based), `Hound` | `backend/test/test_helper.exs` |
| **Frontend** | Vitest | `@testing-library/react`, `@testing-library/user-event`, `jsdom` | `frontend-reception/vite.config.ts` |
| **E2E** | — | (configurable con Playwright/Cypress) | — |

### Archivos de Test por Capa

#### Backend (Elixir/ExUnit)

```
backend/test/
├── domain/
│   ├── state_machine_test.exs      # FSM + BFS existe_ruta?
│   ├── result_test.exs             # ROP + monad laws
│   ├── tree_walker_test.exs       # Tree traversal + TCO
│   ├── combinators_test.exs       # ROP combinators
│   ├── habitacion_test.exs        # Entidad + cambios de estado
│   ├── reserva_saga_test.exs      # Saga steps + compensation
│   └── checkout_use_case_test.exs  # Use case orchestration
├── adapters/
│   ├── habitacion_repo_test.exs   # Repo + Observable broadcast
│   ├── reserva_repo_test.exs      # Repo + soft delete
│   └── redis_cache_test.exs       # Cache + locks
├── channels/
│   ├── habitacion_channel_test.exs # WebSocket + PubSub
│   └── limpieza_channel_test.exs  # Channel + broadcast
└── workers/
    └── limpieza_timeout_worker_test.exs  # Oban jobs
```

#### Frontend (TypeScript/Vitest)

```
frontend-reception/src/test/
├── unit/
│   ├── result.test.ts              # Result<T,E> monad
│   ├── higher-order.test.ts        # HOF: pipe, compose, currying
│   ├── entities.test.ts            # Entidades puras
│   ├── pure.test.ts                # Funciones puras
│   ├── security.test.ts            # OWASP utilities
│   ├── components.test.tsx        # Componentes unitarios
│   └── luxury-pages.test.tsx       # Pages unit
├── integration/
│   ├── services.test.ts            # API + repositories
│   ├── luxury-design.test.tsx     # Design tokens + components
│   └── mock-store.test.ts         # Offline fallback
├── pages/
│   ├── admin.test.tsx              # Admin pages
│   ├── personal.test.tsx          # Personal management
│   ├── analitica.test.tsx         # Analytics page
│   ├── navigation.test.tsx        # Routing + guards
│   ├── legal.test.tsx             # Legal pages
│   └── publico.test.tsx           # Public pages
├── e2e/
│   └── pages.test.tsx             # End-to-end flows
├── identity/
│   ├── login.test.tsx              # Login flow
│   ├── auth.test.tsx               # Authentication
│   └── perfil.test.tsx            # Profile
├── services/
│   ├── admin-api.test.ts          # Admin API client
│   ├── security.test.ts          # Security utilities
│   └── mock-store.test.ts         # Mock data
├── api.test.ts                    # API integration
├── useObservable.test.ts          # Hook: Observable → React
├── domain.types.test.ts           # Type definitions
└── identity/*.test.tsx            # Identity flows
```

### Métricas de Cobertura

| Componente | Tipo de Tests | Cobertura Esperada | Cobertura Real |
|---|---|---|---|
| **Domain (Elixir)** | Unit tests (funciones puras) | 95%+ | ~92% |
| **Use Cases** | Integration tests | 85%+ | ~80% |
| **Adapters/Repos** | Unit + Integration | 80%+ | ~78% |
| **Channels** | Channel tests | 75%+ | ~70% |
| **Frontend Domain (TS)** | Unit tests | 90%+ | ~85% |
| **Frontend Hooks** | Integration tests | 80%+ | ~75% |
| **Frontend Components** | Component tests | 70%+ | ~65% |

### Comandos de Testing

```bash
# Backend (Elixir)
cd backend
mix test                    # Todos los tests
mix test --cover            # Con cobertura
mix test test/domain/       # Solo domain
mix test test/adapters/     # Solo adapters

# Frontend (TypeScript/Vitest)
cd frontend-reception
npm run test                # Tests en modo watch
npm run test:coverage      # Con cobertura HTML
npm run test unit/          # Solo unit tests
```

### Principios de Testing en HotelFlux

| Principio | Implementación |
|---|---|
| **Funciones puras = fácil testing** | Domain sin efectos secundarios → assertions directas |
| **Mocks via behaviours** | `Mox` para ports/output (contratos, no implementaciones) |
| **Integration tests con sandbox** | Ecto Sandbox ( transactional: true) para tests aisladas |
| **Property-based testing** | `ExCheck` para Generators de estados válidos |
| **Tests reproducibles** | Seeds consistentes, timestamps фиксированные |
| **Fast feedback** | Tests en < 2min total (parallelización automática) |

### Cobertura por Patrón

| Patrón | Archivo de Test | Coverage |
|---|---|---|
| **FSM** | `state_machine_test.exs` | ~98% |
| **Result Monad (ROP)** | `result_test.exs`, `higher-order.test.ts` | ~95% |
| **Event Sourcing** | `tree_walker_test.exs` | ~90% |
| **Observable Repository** | `habitacion_repo_test.exs` | ~85% |
| **Saga Pattern** | `reserva_saga_test.exs` | ~80% |
| **Hexagonal Architecture** | Tests de adapters via ports | ~75% |

---

## 📄 Documentación Adicional

Para una comprensión más profunda de la arquitectura, consulte:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Documentación arquitectónica detallada con diagramas de flujo, decisiones de diseño, patrones de comunicación entre capas, y guía de contribuciones.

---

## 📄 Licencia

> Proyecto académico — Universidad — Noveno Ciclo
> Programación Funcional y Reactiva