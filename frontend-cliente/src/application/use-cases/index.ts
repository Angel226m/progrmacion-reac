// ═══════════════════════════════════════════════════════════
// HotelFlux — Casos de Uso (Capa de Aplicación)
//
// Cada caso de uso es una función pura que recibe dependencias
// inyectadas (ports) y retorna una función ejecutable.
//
// Principios demostrados:
// - [INYECCIÓN DE DEPENDENCIAS FUNCIONAL] recibe ports como params
// - [COMPOSICIÓN] pipeline de validación → transformación → persistencia
// - [RESULT] manejo funcional de errores sin excepciones
// - [FUNCIONES PURAS] la lógica de negocio es determinista
// - [HOF] cada caso de uso es una función que retorna una función
// ═══════════════════════════════════════════════════════════

// [INYECCIÓN FUNCIONAL] Los casos de uso reciben los puertos como parámetros.
// No importan infraestructura concreta — dependen solo de interfaces.
import type { IHabitacionRepository, IReservaRepository } from '../ports';
import type { Result } from '../../domain/result';
import { ok, err } from '../../domain/result';
import { filtrarDisponiblesConCapacidad, calcularNoches } from '../../domain/pure';
import type { Habitacion } from '../../domain/entidades/habitacion';
import type { Reserva } from '../../domain/entidades/reserva';

// ──────────────────────────────────────────────────────────
// CASO DE USO: Buscar Habitaciones Disponibles
// ──────────────────────────────────────────────────────────

export interface BuscarDisponiblesParams {
  readonly capacidadMinima: number;
  readonly tipo?: string;
}

/**
 * [HOF - INYECCIÓN FUNCIONAL] Caso de uso: buscar habitaciones disponibles.
 * Recibe los repositorios como parámetros (inyección funcional).
 * Retorna una función ejecutable con la lógica de negocio.
 *
 * Clean Architecture: el caso de uso no sabe de HTTP ni PostgreSQL,
 * solo de los contratos (ports) que le son inyectados.
 *
 * @example
 *   const buscar = crearBuscarDisponibles(habitacionRepo);
 *   const resultado = await buscar({ capacidadMinima: 2 });
 */
export const crearBuscarDisponibles =
  (habitacionRepo: IHabitacionRepository) =>
  async (params: BuscarDisponiblesParams): Promise<Result<readonly Habitacion[]>> => {
    const resultado = await habitacionRepo.listar();
    if (!resultado.ok) return resultado;

    const disponibles = filtrarDisponiblesConCapacidad(resultado.value, params.capacidadMinima);

    const filtradas = params.tipo
      ? disponibles.filter((h) => h.tipo === params.tipo)
      : disponibles;

    return ok(filtradas);
  };

// ──────────────────────────────────────────────────────────
// CASO DE USO: Crear Reserva
// ──────────────────────────────────────────────────────────

export interface CrearReservaInput {
  readonly habitacion_id: string;
  readonly huesped_id: string;
  readonly fecha_entrada: string;
  readonly fecha_salida: string;
  readonly notas?: string;
}

/**
 * [HOF - COMPOSICIÓN] Caso de uso: crear reserva.
 * Pipeline: validar → calcular → persistir.
 * Cada paso puede retornar Error y cortocircuitar el pipeline.
 */
export const crearCrearReserva =
  (habitacionRepo: IHabitacionRepository, reservaRepo: IReservaRepository) =>
  async (input: CrearReservaInput): Promise<Result<Reserva>> => {
    const habitacionResult = await habitacionRepo.obtener(input.habitacion_id);
    if (!habitacionResult.ok) return habitacionResult;
    if (habitacionResult.value.estado !== 'disponible') return err(new Error('La habitación no está disponible'));

    const noches = calcularNoches(input.fecha_entrada, input.fecha_salida);
    if (noches <= 0) return err(new Error('La fecha de salida debe ser posterior a la fecha de entrada'));

    return reservaRepo.crear({
      habitacion_id: input.habitacion_id,
      huesped_id: input.huesped_id,
      fecha_entrada: input.fecha_entrada,
      fecha_salida: input.fecha_salida,
      notas: input.notas,
    });
  };

// ──────────────────────────────────────────────────────────
// CASO DE USO: Validar Disponibilidad
// ──────────────────────────────────────────────────────────

export interface ValidarDisponibilidadParams {
  readonly habitacion_id: string;
  readonly fecha_entrada: string;
  readonly fecha_salida: string;
}

/**
 * [HOF] Caso de uso: validar que una habitación está libre en un período.
 * Función pura: mismos parámetros → mismo resultado (dado el mismo repo).
 */
export const crearValidarDisponibilidad =
  (reservaRepo: IReservaRepository) =>
  async (params: ValidarDisponibilidadParams): Promise<Result<boolean>> => {
    const resultado = await reservaRepo.listarActivas();
    if (!resultado.ok) return resultado;

    const conflicto = resultado.value.some(
      (r: Reserva) =>
        r.habitacion_id === params.habitacion_id &&
        !sonFechasSinSolapamiento(r.fecha_entrada, r.fecha_salida, params.fecha_entrada, params.fecha_salida),
    );

    return ok(!conflicto);
  };

// ──────────────────────────────────────────────────────────
// FUNCIONES PURAS AUXILIARES
// ──────────────────────────────────────────────────────────

/**
 * [FUNCIÓN PURA] Determina si dos rangos de fechas NO se solapan.
 * Transparencia referencial: puras fechas → bool determinista.
 */
const sonFechasSinSolapamiento = (
  inicioA: string,
  finA: string,
  inicioB: string,
  finB: string,
): boolean => {
  const a1 = new Date(inicioA).getTime();
  const a2 = new Date(finA).getTime();
  const b1 = new Date(inicioB).getTime();
  const b2 = new Date(finB).getTime();
  // No se solapan si A termina antes que B empiece, o B termina antes que A empiece
  return a2 <= b1 || b2 <= a1;
};
