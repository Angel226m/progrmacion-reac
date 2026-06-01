// ═══════════════════════════════════════════════════════════
// HotelFlux — useObservable Hook (RxJS → React bridge)
// Puente funcional: suscribe un Observable y sincroniza con estado React
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import type { Observable } from 'rxjs';

/** Normaliza cualquier valor de error a instancia de Error */
function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}

/**
 * Hook genérico: Observable<T> → T (estado React)
 * Se suscribe al montar, se desuscribe al desmontar (cleanup funcional).
 * Incluye complete handler: al completar el stream, loading se apaga.
 */
export function useObservable<T>(
  observable$: Observable<T> | null,
  initialValue: T,
): T {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    if (!observable$) return;

    const subscription = observable$.subscribe({
      next: (val: T) => setValue(val),
      error: (err: unknown) => console.error('[useObservable] Error:', toError(err).message),
      complete: () => { /* stream completado — el estado ya tiene el último valor */ },
    });

    // Cleanup: unsubscribe al desmontar (sin leaks)
    return () => subscription.unsubscribe();
  }, [observable$]);

  return value;
}

/**
 * Hook con loading state: Observable<T> → { data, loading, error }
 */
export function useObservableWithStatus<T>(
  observable$: Observable<T> | null,
  initialValue: T,
): { data: T; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!observable$) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const subscription = observable$.subscribe({
      next: (val: T) => {
        setData(val);
        setLoading(false);
      },
      error: (err: unknown) => {
        setError(toError(err));
        setLoading(false);
      },
      complete: () => setLoading(false),
    });

    return () => subscription.unsubscribe();
  }, [observable$]);

  return { data, loading, error };
}
