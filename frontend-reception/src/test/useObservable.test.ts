// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests del Hook useObservable (RxJS → React)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { useObservable, useObservableWithStatus } from '../hooks/useObservable';

describe('useObservable Hook', () => {
  it('devuelve valor inicial cuando observable es null', () => {
    const { result } = renderHook(() => useObservable(null, 'default'));
    expect(result.current).toBe('default');
  });

  it('emite valores desde BehaviorSubject', () => {
    const subject$ = new BehaviorSubject<number>(0);
    const { result } = renderHook(() => useObservable(subject$, -1));

    expect(result.current).toBe(0);

    act(() => subject$.next(42));
    expect(result.current).toBe(42);

    act(() => subject$.next(100));
    expect(result.current).toBe(100);
  });

  it('emite valores desde Subject regular', () => {
    const subject$ = new Subject<string>();
    const { result } = renderHook(() => useObservable(subject$, 'init'));

    expect(result.current).toBe('init');

    act(() => subject$.next('hello'));
    expect(result.current).toBe('hello');
  });

  it('se desuscribe al desmontar (no memory leaks)', () => {
    const subject$ = new BehaviorSubject<number>(1);
    const { unmount } = renderHook(() => useObservable(subject$, 0));

    unmount();

    // Después de desmontar, el subject debería tener menos observers
    expect(subject$.observed).toBe(false);
  });
});

describe('useObservableWithStatus Hook', () => {
  it('estado inicial: loading true, error null', () => {
    const subject$ = new Subject<number>();
    const { result } = renderHook(() => useObservableWithStatus(subject$, 0));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe(0);
  });

  it('al emitir valor: loading false, data actualizada', () => {
    const subject$ = new BehaviorSubject<string>('test');
    const { result } = renderHook(() => useObservableWithStatus(subject$, ''));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('test');
  });

  it('maneja null observable: loading false', () => {
    const { result } = renderHook(() => useObservableWithStatus(null, []));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([]);
  });
});
