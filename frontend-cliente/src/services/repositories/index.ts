// ═══════════════════════════════════════════════════════════
// HotelFlux — Observable Repository Factory
//
// Fábrica que crea los repositorios observables dado un token.
// Patrón Singleton por token: si el token no cambia, reutiliza
// la misma instancia (y el mismo stream WebSocket compartido).
//
// Uso:
//   const repos = createRepositories(token);
//   // repos.habitaciones es un IHabitacionRepository completo
//   // repos.habitaciones.listar$() → Observable<Result<Habitacion[]>>
// ═══════════════════════════════════════════════════════════

import { HabitacionObservableRepository } from './habitacion.repository';
import { ReservaObservableRepository } from './reserva.repository';
import type { IHabitacionRepository, IReservaRepository } from '../../application/ports';

export interface Repositories {
  readonly habitaciones: IHabitacionRepository;
  readonly reservas: IReservaRepository;
}

let _cached: { token: string; repos: Repositories } | null = null;

/**
 * Fábrica de repositorios observables.
 * Implementa memoización por token: si el token cambia (logout → login),
 * crea nuevas instancias con un nuevo socket WebSocket.
 */
export function createRepositories(token: string): Repositories {
  if (_cached && _cached.token === token) return _cached.repos;

  const repos: Repositories = {
    habitaciones: new HabitacionObservableRepository(token),
    reservas: new ReservaObservableRepository(token),
  };

  _cached = { token, repos };
  return repos;
}

/** Invalida la caché de repositorios (llamar en logout) */
export function invalidateRepositories(): void {
  _cached = null;
}

export { HabitacionObservableRepository } from './habitacion.repository';
export { ReservaObservableRepository } from './reserva.repository';
