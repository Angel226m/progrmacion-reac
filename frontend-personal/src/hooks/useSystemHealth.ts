// ═══════════════════════════════════════════════════════════
// HotelFlux — useSystemHealth Hook
// Consulta /health/detailed para obtener estado real de servicios
// Intervalo: 30s (configurable). Sin autenticación requerida.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

export type ServiceStatus = 'ok' | 'error' | 'unknown';

export interface ServiceInfo {
  readonly status: ServiceStatus;
  readonly latency_ms: number;
}

export interface SystemHealth {
  readonly overall: 'ok' | 'degraded' | 'down' | 'unknown';
  readonly uptime_seconds: number;
  readonly services: {
    readonly backend:  ServiceInfo;
    readonly database: ServiceInfo;
    readonly redis:    ServiceInfo;
  };
  readonly lastChecked: Date | null;
  readonly checking: boolean;
}

const UNKNOWN: SystemHealth = {
  overall:         'unknown',
  uptime_seconds:  0,
  services: {
    backend:  { status: 'unknown', latency_ms: -1 },
    database: { status: 'unknown', latency_ms: -1 },
    redis:    { status: 'unknown', latency_ms: -1 },
  },
  lastChecked: null,
  checking:    false,
};

function formatUptime(seconds: number): string {
  if (seconds < 60)   return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export { formatUptime };

export function useSystemHealth(intervalMs = 30_000) {
  const [health, setHealth] = useState<SystemHealth>(UNKNOWN);

  const check = useCallback(async () => {
    setHealth(prev => ({ ...prev, checking: true }));
    const t0 = Date.now();
    try {
      const res = await fetch('/health/detailed', {
        signal: AbortSignal.timeout(5_000),
        cache: 'no-store',
      });
      const backendMs = Date.now() - t0;

      if (res.ok) {
        const data = await res.json() as {
          status: string;
          uptime_seconds: number;
          services: {
            backend:  { status: string; latency_ms: number };
            database: { status: string; latency_ms: number };
            redis:    { status: string; latency_ms: number };
          };
        };
        setHealth({
          overall:        (data.status as SystemHealth['overall']) ?? 'ok',
          uptime_seconds: data.uptime_seconds ?? 0,
          services: {
            backend:  { status: 'ok', latency_ms: backendMs },
            database: {
              status:     (data.services?.database?.status as ServiceStatus) ?? 'unknown',
              latency_ms: data.services?.database?.latency_ms ?? -1,
            },
            redis: {
              status:     (data.services?.redis?.status as ServiceStatus) ?? 'unknown',
              latency_ms: data.services?.redis?.latency_ms ?? -1,
            },
          },
          lastChecked: new Date(),
          checking:    false,
        });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      setHealth({
        overall:        'down',
        uptime_seconds: 0,
        services: {
          backend:  { status: 'error', latency_ms: Date.now() - t0 },
          database: { status: 'unknown', latency_ms: -1 },
          redis:    { status: 'unknown', latency_ms: -1 },
        },
        lastChecked: new Date(),
        checking:    false,
      });
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);

  return { health, refresh: check };
}
