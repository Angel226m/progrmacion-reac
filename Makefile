# ═══════════════════════════════════════════════════════════
# HotelFlux — Makefile (DevOps Helper)
# Comandos rápidos para desarrollo, build, deploy y monitoreo
#   make help        → lista de targets
#   make up          → stack core
#   make up-obs      → core + observabilidad
#   make ps          → estado de contenedores (formato ancho)
#   make build       → build con cache de BuildKit
# ═══════════════════════════════════════════════════════════

.DEFAULT_GOAL := help

# ── Variables ───────────────────────────────────────────
COMPOSE     ?= docker compose
COMPOSE_DEV ?= $(COMPOSE) --profile default
COMPOSE_OBS ?= $(COMPOSE) --profile default --profile obs
COMPOSE_INI ?= $(COMPOSE) --profile init
COMPOSE_ALL ?= $(COMPOSE) --profile default --profile obs --profile init
BUILDKIT    ?= 1

# Colores ANSI (en Windows Terminal / PowerShell 7 funcionan nativo)
C_GOLD  := \033[33m
C_NAVY  := \033[34m
C_GREEN := \033[32m
C_RED   := \033[31m
C_RESET := \033[0m

export DOCKER_BUILDKIT
export COMPOSE_DOCKER_CLI_BUILD

.PHONY: help up up-obs up-all up-core down down-volumes build build-nocache \
        restart logs logs-backend logs-frontend logs-db logs-obs ps ps-wide ps-obs \
        init-migrate db-migrate db-seed db-reset \
        k6-smoke k6-stress \
        test test-watch test-backend test-k6 lint format \
        clean clean-all health shell-backend shell-db shell-redis shell-iex \
        validate config pull-images prune-images prune-volumes \
        backup-now backup-logs observability-down

# ── Ayuda ───────────────────────────────────────────────
help: ## Muestra esta ayuda
	@echo ""
	@echo "$(C_GOLD)╔══════════════════════════════════════════════════════════╗$(C_RESET)"
	@echo "$(C_GOLD)║        HotelFlux — Comandos Disponibles (Docker)        ║$(C_RESET)"
	@echo "$(C_GOLD)╚══════════════════════════════════════════════════════════╝$(C_RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(C_NAVY)%-22s$(C_RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(C_GOLD)Profiles:$(C_RESET)"
	@echo "  $(C_NAVY)default$(C_RESET)   → core (postgres, redis, backend, frontend, nginx)"
	@echo "  $(C_NAVY)obs$(C_RESET)       → + prometheus, grafana, loki, promtail, exporters"
	@echo "  $(C_NAVY)init$(C_RESET)      → backend-init (migraciones one-shot)"
	@echo ""

## ── Stack completo ─────────────────────────────────────
up: ## Levantar el stack core (default profile)
	$(COMPOSE_DEV) up -d --build
	@echo "$(C_GREEN)✓ Stack core levantado$(C_RESET)"
	@echo "  Portal Cliente → http://localhost:8080"
	@echo "  Panel Personal → http://localhost:80"
	@echo "  Backend        → http://localhost:4000"
	@echo "  PostgreSQL     → 127.0.0.1:5432"

up-obs: ## Levantar core + observabilidad (Grafana en :3002, Prometheus :9090)
	$(COMPOSE_OBS) up -d --build
	@echo "$(C_GREEN)✓ Stack + observabilidad levantado$(C_RESET)"
	@echo "  Grafana     → http://localhost:3002"
	@echo "  Prometheus  → http://localhost:9090"
	@echo "  Loki        → http://localhost:3100"

up-all: ## Levantar core + observabilidad
	@$(MAKE) up-obs

up-init: ## Ejecutar migraciones one-shot (profile init)
	$(COMPOSE_INI) up backend-init
	@echo "$(C_GREEN)✓ Migraciones ejecutadas$(C_RESET)"

up-core: ## Levantar solo servicios core con docker-compose.core.yml
	docker compose -f docker-compose.core.yml up -d --build
	@echo "$(C_GREEN)✓ Stack core (VPS) levantado$(C_RESET)"

down: ## Detener el stack (sin eliminar volúmenes)
	$(COMPOSE_ALL) down
	@echo "$(C_GREEN)✓ Stack detenido$(C_RESET)"

down-volumes: ## Detener y ELIMINAR volúmenes (⚠️ borra la BD)
	$(COMPOSE_ALL) down -v --remove-orphans
	@echo "$(C_GREEN)✓ Stack detenido y volúmenes eliminados$(C_RESET)"

observability-down: ## Detener solo la capa de observabilidad
	$(COMPOSE) --profile obs down
	@echo "$(C_GREEN)✓ Observabilidad detenida$(C_RESET)"

## ── Build ──────────────────────────────────────────────
build: ## Reconstruir imágenes con cache BuildKit
	$(COMPOSE) --profile default --profile obs --profile init build
	@echo "$(C_GREEN)✓ Build completado (con cache)$(C_RESET)"

build-nocache: ## Reconstruir imágenes SIN cache (build limpio)
	$(COMPOSE) --profile default --profile obs --profile init build --no-cache
	@echo "$(C_GREEN)✓ Build completado (sin cache)$(C_RESET)"

pull-images: ## Descargar imágenes base
	$(COMPOSE) --profile default --profile obs --profile init pull
	@echo "$(C_GREEN)✓ Imágenes descargadas$(C_RESET)"

## ── Operación ──────────────────────────────────────────
restart: ## Reiniciar el stack (down + up)
	@$(MAKE) down
	@$(MAKE) up

logs: ## Logs en vivo de todos los servicios
	$(COMPOSE_ALL) logs -f --tail=100

logs-backend: ## Logs solo del backend
	$(COMPOSE) logs -f backend --tail=200

logs-frontend: ## Logs de frontends (cliente + personal)
	$(COMPOSE) logs -f frontend-cliente frontend-personal --tail=100

logs-db: ## Logs de PostgreSQL + Redis
	$(COMPOSE) logs -f postgres redis --tail=100

logs-obs: ## Logs de la capa de observabilidad
	$(COMPOSE) --profile obs logs -f --tail=100

## ── Estado / Inspección ───────────────────────────────
ps: ## Estado de los servicios (tabla custom, oculta profiles inactivos)
	@echo "$(C_GOLD)─── Servicios activos (default + obs) ───$(C_RESET)"
	@$(COMPOSE) --profile default --profile obs ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}\t{{.Health}}"

ps-wide: ## Estado completo (incluye columna Service y Profile)
	@echo "$(C_GOLD)─── Servicios HotelFlux (formato wide) ───$(C_RESET)"
	@$(COMPOSE) --profile default --profile obs ps -a --format "table {{.Name}}\t{{.Image}}\t{{.Service}}\t{{.Status}}\t{{.Health}}\t{{.Ports}}"

ps-obs: ## Estado solo de la capa de observabilidad
	@$(COMPOSE) --profile obs ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"

## ── Base de datos ─────────────────────────────────────
init-migrate: ## Ejecutar migraciones (profile init, one-shot)
	$(COMPOSE_INI) run --rm backend-init
	@echo "$(C_GREEN)✓ Migraciones aplicadas$(C_RESET)"

db-migrate: ## Migraciones (vía backend en ejecución)
	$(COMPOSE) exec backend ./bin/hotelflux eval "HotelFlux.Release.migrate()"
	@echo "$(C_GOLD)💡 Consejo: en dev usa 'make init-migrate'$(C_RESET)"

db-seed: ## Ejecutar seeds
	$(COMPOSE) exec backend ./bin/hotelflux eval "HotelFlux.Release.seed()"
	@echo "$(C_GREEN)✓ Seeds ejecutados$(C_RESET)"

db-reset: ## Rollback total + migrate (⚠️ destruye datos)
	$(COMPOSE) exec backend ./bin/hotelflux eval "HotelFlux.Release.rollback(HotelFlux.Repo, 0)"
	$(COMPOSE) exec backend ./bin/hotelflux eval "HotelFlux.Release.migrate()"
	@echo "$(C_GREEN)✓ BD reseteada y migrada$(C_RESET)"

shell-db: ## Conectar a PostgreSQL via psql
	$(COMPOSE) exec postgres psql -U $$POSTGRES_USER -d $$POSTGRES_DB

shell-iex: ## IEx remoto al backend Phoenix
	$(COMPOSE) exec backend ./bin/hotelflux remote

## ── Load Testing ────────────────────────────────────────
k6-smoke: ## Smoke test con k6 (5 VUs, 30s)
	docker run --rm -i --network=hotelflux grafana/k6:0.56.0 run - < infra/k6/hotelflux-smoke-test.js
	@echo "$(C_GREEN)✓ Smoke test completado$(C_RESET)"

k6-stress: ## Stress test con k6 (escalonado hasta 200 VUs)
	docker run --rm -i --network=hotelflux grafana/k6:0.56.0 run - < infra/k6/hotelflux-stress-test.js
	@echo "$(C_GREEN)✓ Stress test completado$(C_RESET)"

backup-now: ## Ejecutar backup manual inmediato a Backblaze B2
	docker compose -f docker-compose.core.yml run --rm db-backup /usr/local/bin/backup.sh
	@echo "$(C_GREEN)✓ Backup manual completado$(C_RESET)"

backup-logs: ## Ver logs del backup scheduler
	docker compose -f docker-compose.core.yml logs -f --tail=50 db-backup

shell-redis: ## Conectar a Redis via redis-cli
	$(COMPOSE) exec redis sh -c "redis-cli -a \"$$REDIS_PASSWORD\" --no-auth-warning"

## ── Diagnóstico ───────────────────────────────────────
health: ## Health-check de todos los servicios expuestos
	@echo "$(C_NAVY)Verificando servicios HotelFlux…$(C_RESET)"
	@curl -fsS http://localhost:4000/health > /dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) Backend         :4000" || echo "  $(C_RED)✗$(C_RESET) Backend         :4000"
	@curl -fsS http://localhost:3001/health > /dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) Frontend Cliente :3001" || echo "  $(C_RED)✗$(C_RESET) Frontend Cliente :3001"
	@curl -fsS http://localhost:3003/health > /dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) Frontend Personal :3003" || echo "  $(C_RED)✗$(C_RESET) Frontend Personal :3003"
	@curl -fsS http://localhost/health > /dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) Nginx Portal    :80" || echo "  $(C_RED)✗$(C_RESET) Nginx Portal    :80"
	@curl -fsS http://localhost:8080/ > /dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) Nginx Cliente   :8080" || echo "  $(C_RED)✗$(C_RESET) Nginx Cliente   :8080"
	@$(COMPOSE) exec -T postgres pg_isready -U $${POSTGRES_USER:-hotelflux} > /dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) PostgreSQL" || echo "  $(C_RED)✗$(C_RESET) PostgreSQL"
	@$(COMPOSE) exec -T redis sh -c "redis-cli -a \"$${REDIS_PASSWORD}\" --no-auth-warning ping 2>/dev/null | grep -q PONG" && echo "  $(C_GREEN)✓$(C_RESET) Redis" || echo "  $(C_RED)✗$(C_RESET) Redis"

validate: ## Validar la sintaxis de los compose (sin ejecutar nada)
	@echo "$(C_NAVY)Validando docker-compose.yml…$(C_RESET)"
	@$(COMPOSE) config -q && echo "  $(C_GREEN)✓ docker-compose.yml OK$(C_RESET)"
	@echo "$(C_NAVY)Validando docker-compose.prod.yml…$(C_RESET)"
	@$(COMPOSE) -f docker-compose.prod.yml config -q && echo "  $(C_GREEN)✓ docker-compose.prod.yml OK$(C_RESET)"

config: ## Mostrar configuración interpolada (debug)
	$(COMPOSE) --profile default --profile obs config

shell-backend: ## Shell interactivo (IEx remoto) en backend
	$(COMPOSE) exec backend ./bin/hotelflux remote

## ── Testing ────────────────────────────────────────────
test: ## Ejecutar tests frontend (Vitest)
	cd frontend-personal && npx vitest run --reporter=verbose
	cd frontend-cliente && npx vitest run --reporter=verbose
	@echo "$(C_GREEN)✓ Tests completados$(C_RESET)"

test-watch: ## Tests frontend en watch
	cd frontend-personal && npx vitest --reporter=verbose

test-backend: ## Tests backend (ExUnit)
	cd backend && mix test
	@echo "$(C_GREEN)✓ Tests backend completados$(C_RESET)"

test-k6: ## Smoke + Stress test con k6
	@$(MAKE) k6-smoke
	@$(MAKE) k6-stress

## ── Quality ────────────────────────────────────────────
lint: ## Lint frontend (TypeScript check)
	cd frontend-personal && npx tsc --noEmit
	cd frontend-cliente && npx tsc --noEmit
	@echo "$(C_GREEN)✓ TypeScript limpio$(C_RESET)"

format: ## Formatear código
	cd frontend-personal && npx prettier --write "src/**/*.{ts,tsx,css}"
	cd frontend-cliente && npx prettier --write "src/**/*.{ts,tsx,css}"
	cd backend && mix format
	@echo "$(C_GREEN)✓ Código formateado$(C_RESET)"

## ── Limpieza ──────────────────────────────────────────
clean: ## Detener y limpiar (conserva volúmenes con datos)
	$(COMPOSE) --profile default --profile obs --profile init down --remove-orphans
	docker image prune -f
	@echo "$(C_GREEN)✓ Limpieza completada$(C_RESET)"

clean-all: ## Limpieza total (⚠️ incluye volúmenes con BD)
	$(COMPOSE) --profile default --profile obs --profile init down -v --remove-orphans --rmi all
	docker volume prune -f
	@echo "$(C_GREEN)✓ Limpieza total completada$(C_RESET)"

prune-images: ## Podar imágenes huérfanas
	docker image prune -af
	@echo "$(C_GREEN)✓ Imágenes huérfanas eliminadas$(C_RESET)"

prune-volumes: ## Podar volúmenes huérfanos (⚠️ destructivo)
	docker volume prune -f
	@echo "$(C_GREEN)✓ Volúmenes huérfanos eliminados$(C_RESET)"
