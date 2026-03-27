# ═══════════════════════════════════════════════════════════
# HotelFlux — Makefile (DevOps Helper)
# Comandos rápidos para desarrollo, build, deploy y monitoreo
# ═══════════════════════════════════════════════════════════

.DEFAULT_GOAL := help
COMPOSE := docker compose

# ── Colores ──
C_GOLD  := \033[33m
C_NAVY  := \033[34m
C_GREEN := \033[32m
C_RESET := \033[0m

.PHONY: help up down build restart logs ps clean test lint db-reset db-migrate

## ── Ayuda ──
help: ## Muestra esta ayuda
	@echo ""
	@echo "$(C_GOLD)╔══════════════════════════════════════════╗$(C_RESET)"
	@echo "$(C_GOLD)║     HotelFlux — Comandos Disponibles     ║$(C_RESET)"
	@echo "$(C_GOLD)╚══════════════════════════════════════════╝$(C_RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(C_NAVY)%-18s$(C_RESET) %s\n", $$1, $$2}'
	@echo ""

## ── Stack completo ──
up: ## Levantar todo el stack (build + start)
	$(COMPOSE) up --build -d
	@echo "$(C_GREEN)✓ Stack levantado$(C_RESET)"
	@echo "  Frontend → http://localhost:3000"
	@echo "  Backend  → http://localhost:4000"
	@echo "  Nginx    → http://localhost"
	@echo "  Grafana  → http://localhost:3001"

down: ## Detener todo el stack
	$(COMPOSE) down
	@echo "$(C_GREEN)✓ Stack detenido$(C_RESET)"

build: ## Reconstruir imágenes sin levantar
	$(COMPOSE) build --no-cache
	@echo "$(C_GREEN)✓ Build completado$(C_RESET)"

restart: ## Reiniciar todo el stack
	$(COMPOSE) down && $(COMPOSE) up --build -d
	@echo "$(C_GREEN)✓ Stack reiniciado$(C_RESET)"

## ── Observación ──
logs: ## Ver logs de todos los contenedores (follow)
	$(COMPOSE) logs -f --tail=100

logs-backend: ## Logs solo del backend
	$(COMPOSE) logs -f backend --tail=200

logs-frontend: ## Logs solo del frontend
	$(COMPOSE) logs -f frontend --tail=100

ps: ## Estado de los contenedores
	$(COMPOSE) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

## ── Base de datos ──
db-reset: ## Borrar y recrear la base de datos
	$(COMPOSE) exec backend ./bin/hotelflux eval "HotelFlux.Release.rollback(HotelFlux.Repo, 0)"
	$(COMPOSE) exec backend ./bin/hotelflux eval "HotelFlux.Release.migrate()"
	@echo "$(C_GREEN)✓ BD reseteada y migrada$(C_RESET)"

db-migrate: ## Ejecutar migraciones pendientes
	$(COMPOSE) exec backend ./bin/hotelflux eval "HotelFlux.Release.migrate()"
	@echo "$(C_GREEN)✓ Migraciones aplicadas$(C_RESET)"

db-seed: ## Ejecutar seeds
	$(COMPOSE) exec backend ./bin/hotelflux eval "HotelFlux.Release.seed()"
	@echo "$(C_GREEN)✓ Seeds ejecutados$(C_RESET)"

## ── Testing ──
test: ## Ejecutar tests frontend (Vitest)
	cd frontend-reception && npx vitest run --reporter=verbose
	@echo "$(C_GREEN)✓ Tests completados$(C_RESET)"

test-watch: ## Tests frontend en modo watch
	cd frontend-reception && npx vitest --reporter=verbose

test-backend: ## Ejecutar tests backend (ExUnit)
	cd backend && mix test
	@echo "$(C_GREEN)✓ Tests backend completados$(C_RESET)"

## ── Quality ──
lint: ## Lint del frontend (TypeScript check)
	cd frontend-reception && npx tsc --noEmit
	@echo "$(C_GREEN)✓ TypeScript limpio$(C_RESET)"

format: ## Formatear código
	cd frontend-reception && npx prettier --write "src/**/*.{ts,tsx,css}"
	cd backend && mix format
	@echo "$(C_GREEN)✓ Código formateado$(C_RESET)"

## ── Limpieza ──
clean: ## Limpiar volúmenes, imágenes huérfanas y cache
	$(COMPOSE) down -v --remove-orphans
	docker image prune -f
	@echo "$(C_GREEN)✓ Limpieza completada$(C_RESET)"

clean-all: ## Limpieza total (incluye volúmenes de BD)
	$(COMPOSE) down -v --remove-orphans --rmi all
	docker volume prune -f
	@echo "$(C_GREEN)✓ Limpieza total completada$(C_RESET)"

## ── Diagnóstico ──
health: ## Verificar salud de los servicios
	@echo "$(C_NAVY)Verificando servicios...$(C_RESET)"
	@curl -sf http://localhost:4000/health > /dev/null && echo "  $(C_GREEN)✓ Backend OK$(C_RESET)" || echo "  ✗ Backend DOWN"
	@curl -sf http://localhost:3000/health > /dev/null && echo "  $(C_GREEN)✓ Frontend OK$(C_RESET)" || echo "  ✗ Frontend DOWN"
	@curl -sf http://localhost > /dev/null && echo "  $(C_GREEN)✓ Nginx OK$(C_RESET)" || echo "  ✗ Nginx DOWN"
	@docker exec hotelflux_postgres pg_isready -U hotelflux > /dev/null 2>&1 && echo "  $(C_GREEN)✓ PostgreSQL OK$(C_RESET)" || echo "  ✗ PostgreSQL DOWN"
	@docker exec hotelflux_redis redis-cli ping > /dev/null 2>&1 && echo "  $(C_GREEN)✓ Redis OK$(C_RESET)" || echo "  ✗ Redis DOWN"

shell-backend: ## Shell interactivo del backend
	$(COMPOSE) exec backend ./bin/hotelflux remote

shell-db: ## Conectar a PostgreSQL via psql
	$(COMPOSE) exec postgres psql -U hotelflux -d hotelflux_dev
