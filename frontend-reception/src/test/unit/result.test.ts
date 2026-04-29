// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Result<T,E> Monad
//
// Verifica que Result implemente correctamente el patrón
// Railway Oriented Programming (ROP).
// ═══════════════════════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest';
import {
  ok,
  err,
  mapResult,
  flatMapResult,
  mapError,
  recoverResult,
  getOrElse,
  fold,
  isOk,
  isErr,
  sequence,
  traverse,
  tryCatch,
} from '../../domain/result';

describe('Result<T,E> — Railway Oriented Programming', () => {
  // ────────────────────────────────────────────────────────
  // Constructores
  // ────────────────────────────────────────────────────────

  describe('ok / err', () => {
    it('ok crea un Result exitoso', () => {
      const r = ok(42);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(42);
    });

    it('err crea un Result fallido', () => {
      const r = err(new Error('fallo'));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.message).toBe('fallo');
    });
  });

  // ────────────────────────────────────────────────────────
  // Type Guards
  // ────────────────────────────────────────────────────────

  describe('isOk / isErr — type guards', () => {
    it('isOk retorna true para ok()', () => {
      expect(isOk(ok(1))).toBe(true);
    });

    it('isOk retorna false para err()', () => {
      expect(isOk(err('x'))).toBe(false);
    });

    it('isErr retorna true para err()', () => {
      expect(isErr(err('x'))).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // mapResult — Functor law
  // ────────────────────────────────────────────────────────

  describe('mapResult (HOF curried)', () => {
    it('transforma el valor si es ok', () => {
      const doblar = mapResult((x: number) => x * 2);
      const resultado = doblar(ok(5));
      expect(isOk(resultado)).toBe(true);
      if (isOk(resultado)) expect(resultado.value).toBe(10);
    });

    it('no aplica la función si es err', () => {
      const fn = vi.fn();
      const doblar = mapResult(fn);
      doblar(err('error'));
      expect(fn).not.toHaveBeenCalled();
    });

    it('identidad: map(id) ≡ id (Functor law)', () => {
      const r = ok(99);
      const r2 = mapResult((x: number) => x)(r);
      if (isOk(r) && isOk(r2)) expect(r2.value).toBe(r.value);
    });
  });

  // ────────────────────────────────────────────────────────
  // flatMapResult — Monad chain
  // ────────────────────────────────────────────────────────

  describe('flatMapResult (HOF curried)', () => {
    it('encadena dos operaciones exitosas', () => {
      // [MÓNADA] flatMapResult permite encadenar operaciones que pueden fallar
      const paso1 = flatMapResult((x: number) => ok(x + 10));
      const paso2 = flatMapResult((x: number) => ok(x * 2));
      const resultado = paso2(paso1(ok(5)));
      if (isOk(resultado)) expect(resultado.value).toBe(30); // (5+10)*2
    });

    it('cortocircuita en el primer error (Railway Oriented Programming)', () => {
      const fn2 = vi.fn();
      // Anotamos los tipos explícitamente para que TypeScript unifique el carril de error
      const paso1 = flatMapResult<number, number, string>((_) => err('error'));
      const paso2 = flatMapResult<number, number, string>((x) => { fn2(); return ok(x); });
      paso2(paso1(ok(5)));
      expect(fn2).not.toHaveBeenCalled(); // fn2 no se ejecutó porque paso1 falló
    });
  });

  // ────────────────────────────────────────────────────────
  // mapError
  // ────────────────────────────────────────────────────────

  describe('mapError', () => {
    it('transforma el error', () => {
      const r = mapError((e: string) => `[ERROR] ${e}`)(err('fallo'));
      if (isErr(r)) expect(r.error).toBe('[ERROR] fallo');
    });

    it('no toca un ok', () => {
      const r = mapError((e: string) => `[ERROR] ${e}`)(ok(42));
      if (isOk(r)) expect(r.value).toBe(42);
    });
  });

  // ────────────────────────────────────────────────────────
  // recoverResult
  // ────────────────────────────────────────────────────────

  describe('recoverResult', () => {
    it('convierte error en ok con función de recuperación', () => {
      const r = recoverResult((_: string) => ok(0))(err('timeout'));
      if (isOk(r)) expect(r.value).toBe(0);
    });

    it('no afecta un ok', () => {
      const r = recoverResult((_: string) => ok(0))(ok(99));
      if (isOk(r)) expect(r.value).toBe(99);
    });
  });

  // ────────────────────────────────────────────────────────
  // getOrElse / fold
  // ────────────────────────────────────────────────────────

  describe('getOrElse (curried)', () => {
    it('retorna el valor si es ok', () => {
      // [CURRYING] getOrElse(default)(result) — aplicación parcial
      expect(getOrElse(0)(ok(42))).toBe(42);
    });

    it('retorna default si es error', () => {
      expect(getOrElse(0)(err('fallo'))).toBe(0);
    });
  });

  describe('fold', () => {
    it('ejecuta onOk si es exitoso', () => {
      const r = fold(
        (v: number) => `éxito: ${v}`,
        (_: string) => 'fallo',
      )(ok(5));
      expect(r).toBe('éxito: 5');
    });

    it('ejecuta onErr si es error', () => {
      const r = fold(
        (v: number) => `éxito: ${v}`,
        (e: string) => `fallo: ${e}`,
      )(err('boom'));
      expect(r).toBe('fallo: boom');
    });
  });

  // ────────────────────────────────────────────────────────
  // sequence — lista de Results
  // ────────────────────────────────────────────────────────

  describe('sequence (recursivo)', () => {
    it('combina lista de ok en ok de lista', () => {
      const r = sequence([ok(1), ok(2), ok(3)]);
      if (isOk(r)) expect(r.value).toEqual([1, 2, 3]);
    });

    it('retorna primer error si hay alguno', () => {
      const r = sequence([ok(1), err('malo'), ok(3)]);
      expect(isErr(r)).toBe(true);
      if (isErr(r)) expect(r.error).toBe('malo');
    });

    it('lista vacía retorna ok([])', () => {
      const r = sequence([]);
      if (isOk(r)) expect(r.value).toEqual([]);
    });
  });

  // ────────────────────────────────────────────────────────
  // traverse — map + sequence
  // ────────────────────────────────────────────────────────

  describe('traverse (HOF curried)', () => {
    it('aplica función y agrupa resultados', () => {
      // [CURRYING] traverse(fn)(items) — traverse es una HOF curried
      const r = traverse((x: number) => ok(x * 10))([1, 2, 3]);
      if (isOk(r)) expect(r.value).toEqual([10, 20, 30]);
    });

    it('cortocircuita en primer fallo', () => {
      const r = traverse((x: number) => (x === 2 ? err('dos falla') : ok(x)))([1, 2, 3]);
      expect(isErr(r)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // tryCatch
  // ────────────────────────────────────────────────────────

  describe('tryCatch', () => {
    it('captura excepción y retorna err', () => {
      // [ROP] convierte código imperativo que lanza en código funcional con Result
      const r = tryCatch<number, Error>(
        () => { throw new Error('boom'); },
        (e) => e instanceof Error ? e : new Error(String(e)),
      );
      expect(isErr(r)).toBe(true);
      if (isErr(r)) expect(r.error.message).toBe('boom');
    });

    it('retorna ok si no lanza', () => {
      const r = tryCatch(() => 42, (e) => new Error(String(e)));
      if (isOk(r)) expect(r.value).toBe(42);
    });
  });
});
