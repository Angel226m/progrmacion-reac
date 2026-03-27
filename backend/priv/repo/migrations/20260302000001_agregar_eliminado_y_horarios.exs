defmodule HotelFlux.Repo.Migrations.AgregarEliminadoYHorarios do
  @moduledoc """
  Migración v2 — Agrega:
  - Campo `eliminado` (soft delete) a todas las entidades
  - Tabla `pisos` para gestión de pisos
  - Tabla `horarios_personal` para turnos de trabajo
  - Tabla `clasificaciones_habitacion` para categorizar habitaciones
  - Índices optimizados para dashboards y consultas analíticas
  - Campo `recordarme` y mejoras de seguridad en usuarios
  """
  use Ecto.Migration

  def change do
    # ═══════════════════════════════════════════════════════════
    # SOFT DELETE — Campo `eliminado` en todas las entidades
    # ═══════════════════════════════════════════════════════════
    alter table(:usuarios) do
      add :eliminado, :boolean, default: false, null: false
      add :eliminado_en, :utc_datetime
    end

    alter table(:habitaciones) do
      add :eliminado, :boolean, default: false, null: false
      add :eliminado_en, :utc_datetime
      add :clasificacion, :string  # VIP, estándar, económica, premium
    end

    alter table(:huespedes) do
      add :eliminado, :boolean, default: false, null: false
      add :eliminado_en, :utc_datetime
    end

    alter table(:reservas) do
      add :eliminado, :boolean, default: false, null: false
      add :eliminado_en, :utc_datetime
    end

    alter table(:productos) do
      add :eliminado, :boolean, default: false, null: false
      add :eliminado_en, :utc_datetime
    end

    alter table(:consumos) do
      add :eliminado, :boolean, default: false, null: false
      add :eliminado_en, :utc_datetime
    end

    alter table(:pagos) do
      add :eliminado, :boolean, default: false, null: false
      add :eliminado_en, :utc_datetime
    end

    alter table(:tareas_limpieza) do
      add :eliminado, :boolean, default: false, null: false
      add :eliminado_en, :utc_datetime
    end

    # ═══════════════════════════════════════════════════════════
    # PISOS — Gestión de pisos del hotel
    # ═══════════════════════════════════════════════════════════
    create table(:pisos, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :numero, :integer, null: false
      add :nombre, :string, null: false            # "Planta Baja", "Piso Premium", etc.
      add :descripcion, :string
      add :activo, :boolean, default: true
      add :eliminado, :boolean, default: false, null: false
      add :eliminado_en, :utc_datetime
      timestamps(type: :utc_datetime)
    end
    create unique_index(:pisos, [:numero])

    # ═══════════════════════════════════════════════════════════
    # TURNOS — Definición de turnos de trabajo
    # ═══════════════════════════════════════════════════════════
    create table(:turnos, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :nombre, :string, null: false             # "Mañana", "Tarde", "Noche"
      add :hora_inicio, :time, null: false          # 08:00, 16:00, 00:00
      add :hora_fin, :time, null: false             # 16:00, 00:00, 08:00
      add :activo, :boolean, default: true
      add :eliminado, :boolean, default: false, null: false
      timestamps(type: :utc_datetime)
    end

    # ═══════════════════════════════════════════════════════════
    # HORARIOS PERSONAL — Asignación de turnos a empleados
    # ═══════════════════════════════════════════════════════════
    create table(:horarios_personal, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :empleado_id, references(:usuarios, type: :binary_id, on_delete: :restrict), null: false
      add :turno_id, references(:turnos, type: :binary_id, on_delete: :restrict), null: false
      add :fecha, :date, null: false                # Día específico del turno
      add :dia_semana, :integer                     # 1=Lunes ... 7=Domingo
      add :estado, :string, default: "programado"   # programado, asistio, falta, permiso
      add :notas, :text
      add :eliminado, :boolean, default: false, null: false
      timestamps(type: :utc_datetime)
    end
    create index(:horarios_personal, [:empleado_id])
    create index(:horarios_personal, [:turno_id])
    create index(:horarios_personal, [:fecha])
    create unique_index(:horarios_personal, [:empleado_id, :fecha], name: :horarios_empleado_fecha_unico)

    # ═══════════════════════════════════════════════════════════
    # ÍNDICES OPTIMIZADOS PARA DASHBOARDS Y ANALÍTICAS
    # ═══════════════════════════════════════════════════════════

    # Índices parciales para soft delete (excluir eliminados)
    create index(:usuarios, [:eliminado], where: "eliminado = false", name: :idx_usuarios_activos)
    create index(:habitaciones, [:eliminado], where: "eliminado = false", name: :idx_habitaciones_activas)
    create index(:reservas, [:eliminado], where: "eliminado = false", name: :idx_reservas_activas)
    create index(:productos, [:eliminado], where: "eliminado = false", name: :idx_productos_activos)

    # Índices compuestos para consultas analíticas
    create index(:reservas, [:estado, :fecha_entrada], name: :idx_reservas_estado_entrada)
    create index(:consumos, [:inserted_at, :estado], name: :idx_consumos_fecha_estado)
    create index(:tareas_limpieza, [:completada_en, :duracion_minutos], name: :idx_limpieza_metricas)
    create index(:pagos, [:estado, :inserted_at], name: :idx_pagos_estado_fecha)
    create index(:habitaciones, [:piso, :estado], name: :idx_habitaciones_piso_estado)

    # Índice para búsquedas de text en huéspedes
    create index(:huespedes, [:nombre, :apellido], name: :idx_huespedes_nombre)

    # Índice para eventos por rango de tiempo (dashboards)
    create index(:eventos_dominio, [:tipo, :ocurrido_en], name: :idx_eventos_tipo_fecha)
  end
end
