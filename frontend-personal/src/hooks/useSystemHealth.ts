import { useState, useEffect, useCallback } from 'react';
import { fromPromise, fold } from '../domain/result';

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

const FORMAT_UPTIME: readonly { readonly max: number; readonly format: (s: number) => string }[] = [
  { max: 60, format: (s: number) => `${s}s` },
  { max: 3600, format: (s: number) => `${Math.floor(s / 60)}m ${s % 60}s` },
  { max: Infinity, format: (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` },
] as const;

function formatUptime(seconds: number): string {
  return FORMAT_UPTIME.find((f) => seconds < f.max)!.format(seconds);
}

export { formatUptime };

export function useSystemHealth(intervalMs = 30_000) {
  const [health, setHealth] = useState<SystemHealth>(UNKNOWN);

  const check = useCallback(async () => {
    setHealth(prev => ({ ...prev, checking: true }));
    const t0 = Date.now();

    const result = await fromPromise(
      fetch('/health/detailed', {
        signal: AbortSignal.timeout(5_000),
        cache: 'no-store',
      }).then((res) =>
        res.ok
          ? (res.json() as Promise<{ status: string; uptime_seconds: number; services: { backend: { status: string; latency_ms: number }; database: { status: string; latency_ms: number }; redis: { status: string; latency_ms: number } } }>)
          : Promise.reject(new Error(`HTTP ${res.status}`)),
      ),
      () => null as null,
    );

    fold(
      (data: { status: string; uptime_seconds: number; services: { backend: { status: string; latency_ms: number }; database: { status: string; latency_ms: number }; redis: { status: string; latency_ms: number } } }) =>
        setHealth({
          overall: (data.status as SystemHealth['overall']) ?? 'ok',
          uptime_seconds: data.uptime_seconds ?? 0,
          services: {
            backend: { status: 'ok' as ServiceStatus, latency_ms: Date.now() - t0 },
            database: {
              status: (data.services?.database?.status as ServiceStatus) ?? 'unknown',
              latency_ms: data.services?.database?.latency_ms ?? -1,
            },
            redis: {
              status: (data.services?.redis?.status as ServiceStatus) ?? 'unknown',
              latency_ms: data.services?.redis?.latency_ms ?? -1,
            },
          },
          lastChecked: new Date(),
          checking: false,
        }),
      () => setHealth({
        overall: 'down',
        uptime_seconds: 0,
        services: {
          backend: { status: 'error', latency_ms: Date.now() - t0 },
          database: { status: 'unknown', latency_ms: -1 },
          redis: { status: 'unknown', latency_ms: -1 },
        },
        lastChecked: new Date(),
        checking: false,
      }),
    )(result);
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);

  return { health, refresh: check };
}
