// ═══════════════════════════════════════════════════════════
// HotelFlux — Tipos: Métricas y Dashboard
// ═══════════════════════════════════════════════════════════

export interface MetricasDashboard {
  readonly total_habitaciones: number;
  readonly disponibles: number;
  readonly ocupadas: number;
  readonly en_limpieza: number;
  readonly en_mantenimiento: number;
  readonly reservadas: number;
  readonly porcentaje_ocupacion: number;
  readonly ingresos_hoy: string;
  readonly checkins_hoy: number;
  readonly checkouts_hoy: number;
  readonly promedio_limpieza_min: number;
}

export interface ConteoEstados {
  readonly disponible: number;
  readonly reservada: number;
  readonly ocupada: number;
  readonly en_limpieza: number;
  readonly en_mantenimiento: number;
  readonly bloqueada: number;
}
