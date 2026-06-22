import { useState, useEffect } from 'react';
import type { Observable } from 'rxjs';

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

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
    });

    return () => subscription.unsubscribe();
  }, [observable$]);

  return value;
}

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
