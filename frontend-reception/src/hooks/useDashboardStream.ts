import { useMemo } from 'react';
import { of } from 'rxjs';
import { useAuth } from './useAuth';
import { useObservable } from './useObservable';
import { getSocket } from '../streams/websocket.stream';
import {
  createDashboardStream,
  createHistorialStream,
  createEventosStream,
  calcularKPIs,
  type MetricasHistorial,
  type KPIs,
} from '../streams/dashboard.stream';
import type { MetricasDashboard, EventoDominio } from '../domain/types';

const METRICAS_INIT: MetricasDashboard = {
  total_habitaciones: 0,
  disponibles: 0,
  ocupadas: 0,
  en_limpieza: 0,
  en_mantenimiento: 0,
  reservadas: 0,
  porcentaje_ocupacion: 0,
  ingresos_hoy: '0',
  checkins_hoy: 0,
  checkouts_hoy: 0,
  promedio_limpieza_min: 0,
};

export function useDashboardStream() {
  const { token } = useAuth();

  const metricas$ = useMemo(() => {
    if (!token) return null;
    try {
      const socket = getSocket(token);
      return createDashboardStream(socket);
    } catch {
      return of(METRICAS_INIT);
    }
  }, [token]);

  const historial$ = useMemo(() => {
    if (!metricas$) return null;
    return createHistorialStream(metricas$);
  }, [metricas$]);

  const eventos$ = useMemo(() => {
    if (!token) return null;
    try {
      const socket = getSocket(token);
      return createEventosStream(socket);
    } catch {
      return of([] as readonly EventoDominio[]);
    }
  }, [token]);

  const metricas = useObservable(metricas$, METRICAS_INIT);
  const historial = useObservable<readonly MetricasHistorial[]>(historial$, []);
  const eventos = useObservable<readonly EventoDominio[]>(eventos$, []);

  const kpis: KPIs = useMemo(() => calcularKPIs(metricas), [metricas]);

  return { metricas, historial, eventos, kpis };
}