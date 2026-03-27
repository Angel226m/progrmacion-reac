defmodule HotelFlux.Repo.Migrations.AddPerformanceIndexes do
  @moduledoc """
  Agrega índices de rendimiento para consultas frecuentes:
  - Disponibilidad de habitaciones (estado + tipo)
  - Reservas activas por fecha
  - Búsqueda de huéspedes por documento
  - Usuarios activos
  - Productos disponibles por categoría
  - Tareas de limpieza pendientes
  - Consumos pendientes
  """
  use Ecto.Migration

  def change do
    # ── Habitaciones: búsqueda de disponibilidad ──
    # Consulta frecuente: WHERE estado = 'disponible' AND tipo = ?
    create index(:habitaciones, [:estado, :tipo],
      name: :idx_habitaciones_estado_tipo)

    create index(:habitaciones, [:piso, :estado],
      name: :idx_habitaciones_piso_estado)

    # ── Reservas: consultas de disponibilidad por rango de fechas ──
    # La consulta más crítica del sistema: encontrar habitaciones
    # que NO tengan reservas en un rango dado
    create index(:reservas, [:habitacion_id, :fecha_entrada, :fecha_salida, :estado],
      name: :idx_reservas_disponibilidad,
      where: "estado IN ('pendiente', 'confirmada')")

    # Reservas activas del día (check-in / check-out)
    create index(:reservas, [:fecha_entrada, :estado],
      name: :idx_reservas_checkin_diario,
      where: "estado = 'confirmada'")

    create index(:reservas, [:fecha_salida, :estado],
      name: :idx_reservas_checkout_diario,
      where: "estado IN ('confirmada', 'completada')")

    # ── Huéspedes: búsqueda por documento ──
    create index(:huespedes, [:documento],
      name: :idx_huespedes_documento,
      where: "documento IS NOT NULL")

    create index(:huespedes, [:apellido, :nombre],
      name: :idx_huespedes_nombre)

    # ── Usuarios: activos por rol ──
    create index(:usuarios, [:rol, :activo],
      name: :idx_usuarios_rol_activo,
      where: "activo = true")

    # ── Productos: disponibles por categoría ──
    create index(:productos, [:disponible, :categoria],
      name: :idx_productos_disponibles,
      where: "disponible = true")

    # ── Tareas de limpieza: pendientes por prioridad ──
    create index(:tareas_limpieza, [:estado, :inserted_at],
      name: :idx_tareas_pendientes,
      where: "estado = 'pendiente'")

    # ── Consumos: pendientes de cobro ──
    create index(:consumos, [:estado, :reserva_id],
      name: :idx_consumos_pendientes,
      where: "estado = 'pendiente'")

    # ── Pagos: pendientes de procesamiento ──
    create index(:pagos, [:estado],
      name: :idx_pagos_pendientes,
      where: "estado = 'pendiente'")

    # ── Eventos: consulta por agregado y rango temporal ──
    create index(:eventos_dominio, [:agregado_tipo, :agregado_id, :ocurrido_en],
      name: :idx_eventos_agregado_temporal)
  end
end
