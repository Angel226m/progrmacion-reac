// ═══════════════════════════════════════════════════════════
// HotelFlux — Drawer de detalle de reserva (responsive)
// ═══════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import type { ReservaDetalle, ConsumoReserva } from '../../services/publico.api';

// ── Helpers ──

function formatFecha(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Status config ──

const ESTADO_CFG: Record<string, { label: string; dot: string; badge: string; bg: string }> = {
  confirmada:  { label: 'Confirmada',  dot: 'bg-emerald-500', badge: 'text-emerald-700 bg-emerald-50 ring-emerald-200', bg: 'from-emerald-600 to-emerald-700' },
  checked_in:  { label: 'En curso',    dot: 'bg-blue-500',    badge: 'text-blue-700 bg-blue-50 ring-blue-200',          bg: 'from-blue-600 to-blue-700' },
  checked_out: { label: 'Completada',  dot: 'bg-slate-400',   badge: 'text-slate-600 bg-slate-100 ring-slate-200',      bg: 'from-slate-500 to-slate-600' },
  cancelada:   { label: 'Cancelada',   dot: 'bg-red-500',     badge: 'text-red-600 bg-red-50 ring-red-200',             bg: 'from-red-600 to-red-700' },
  pendiente:   { label: 'Pendiente',   dot: 'bg-amber-500',   badge: 'text-amber-700 bg-amber-50 ring-amber-200',       bg: 'from-amber-500 to-amber-600' },
};

const TIPO_ICON: Record<string, string> = {
  simple: '🛏️', doble: '🛏️', suite: '✨', presidencial: '👑', familiar: '👨‍👩‍👧‍👦',
};

const METODO_PAGO: Record<string, string> = {
  tarjeta: '💳 Tarjeta', yape: '📱 Yape', efectivo: '💵 Efectivo',
};

// ── Timeline step ──

function TimelineStep({
  done, active, label, desc,
}: { done: boolean; active: boolean; label: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ${
          done    ? 'bg-emerald-500 text-white ring-emerald-200'
          : active ? 'bg-[#0c1d3d] text-[#c5a255] ring-[#c5a255]/30'
          : 'bg-slate-100 text-slate-400 ring-slate-200'
        }`}>
          {done ? '✓' : active ? '●' : '○'}
        </div>
        <div className="mt-1 h-full w-0.5 bg-slate-100" />
      </div>
      <div className="pb-4">
        <p className={`text-sm font-semibold ${active ? 'text-[#0c1d3d]' : done ? 'text-slate-700' : 'text-slate-400'}`}>{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

// ── ConsumoRow ──

function ConsumoRow({ c }: { c: ConsumoReserva }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-700">{c.producto}</p>
        <p className="text-xs text-slate-400">x{c.cantidad} · S/ {parseFloat(c.precio_unitario).toFixed(2)} c/u</p>
      </div>
      <span className={`text-sm font-bold ${c.estado === 'cancelado' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
        S/ {parseFloat(c.total).toFixed(2)}
      </span>
    </div>
  );
}

// ── Main Drawer ──

interface Props {
  reservaId: string | null;
  token: string;
  onClose: () => void;
  onCancelSuccess: (id: string) => void;
  onRefresh?: () => Promise<string | null>;
  /** fetcher function injected so we don't create circular deps */
  fetchDetalle: (id: string, token: string, onRefresh?: () => Promise<string | null>) => Promise<ReservaDetalle>;
  cancelarReserva: (id: string, token: string, onRefresh?: () => Promise<string | null>) => Promise<void>;
}

export default function ReservaDetalleDrawer({
  reservaId, token, onClose, onCancelSuccess, onRefresh, fetchDetalle, cancelarReserva,
}: Props) {
  const [data, setData] = useState<ReservaDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  const load = useCallback(async (id: string) => {
    setCargando(true);
    setError(null);
    setData(null);
    try {
      const d = await fetchDetalle(id, token, onRefresh);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar detalle');
    } finally {
      setCargando(false);
    }
  }, [fetchDetalle, token, onRefresh]);

  useEffect(() => {
    if (reservaId) {
      load(reservaId);
      setConfirmarCancelar(false);
    } else {
      setData(null);
    }
  }, [reservaId, load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!reservaId) return null;

  const cfg = data ? (ESTADO_CFG[data.estado] ?? ESTADO_CFG['pendiente']!) : null;
  const tipoIcon = data ? (TIPO_ICON[data.tipo?.toLowerCase() ?? ''] ?? '🏨') : '🏨';
  const esCancelable = data && (data.estado === 'confirmada' || data.estado === 'pendiente');
  const noches = data?.noches ?? 1;
  const totalBase = data ? parseFloat(data.precio_noche) * noches : 0;
  const totalConsumos = data?.consumos
    .filter(c => c.estado !== 'cancelado')
    .reduce((s, c) => s + parseFloat(c.total), 0) ?? 0;

  const handleCancelar = async () => {
    if (!data || !reservaId) return;
    setCancelando(true);
    try {
      await cancelarReserva(reservaId, token, onRefresh);
      onCancelSuccess(reservaId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cancelar');
    } finally {
      setCancelando(false);
      setConfirmarCancelar(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de reserva"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl sm:max-w-lg"
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 bg-gradient-to-r ${cfg?.bg ?? 'from-[#0c1d3d] to-[#1a3a6e]'} text-white`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tipoIcon}</span>
            <div>
              {data && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Reserva</p>
                  <p className="font-mono text-lg font-extrabold">{data.codigo}</p>
                </>
              )}
              {cargando && <p className="text-sm opacity-80">Cargando...</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {cargando && (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#c5a255] border-t-transparent" />
            </div>
          )}

          {error && !cargando && (
            <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {data && !cargando && (
            <div className="space-y-0 divide-y divide-slate-100">

              {/* Estado badge */}
              <div className="flex items-center justify-between px-5 py-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${cfg?.badge}`}>
                  <span className={`h-2 w-2 rounded-full ${cfg?.dot}`} />
                  {cfg?.label}
                </span>
                <span className="text-xs text-slate-400">Creada {formatDateTime(data.inserted_at)}</span>
              </div>

              {/* Habitación */}
              <section className="px-5 py-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Habitación</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Número</p>
                    <p className="text-lg font-extrabold text-[#0c1d3d]">{data.habitacion}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Tipo</p>
                    <p className="font-bold capitalize text-slate-800">{data.tipo}</p>
                  </div>
                  {data.piso !== null && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Piso</p>
                      <p className="font-bold text-slate-800">{data.piso}</p>
                    </div>
                  )}
                  {data.clasificacion && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Categoría</p>
                      <p className="font-bold capitalize text-slate-800">{data.clasificacion}</p>
                    </div>
                  )}
                </div>
                {data.amenidades.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {data.amenidades.map((a) => (
                      <span key={a} className="rounded-full bg-[#c5a255]/10 px-2.5 py-1 text-xs font-medium text-[#0c1d3d]">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Fechas */}
              <section className="px-5 py-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Fechas</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs font-semibold text-emerald-600">Check-in</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{formatFecha(data.fecha_entrada)}</p>
                    <p className="text-[10px] text-slate-400">Desde las 15:00</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs font-semibold text-red-500">Check-out</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{formatFecha(data.fecha_salida)}</p>
                    <p className="text-[10px] text-slate-400">Antes de las 12:00</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-lg bg-[#0c1d3d] px-3 py-1 text-sm font-extrabold text-[#c5a255]">
                    {noches} noche{noches !== 1 ? 's' : ''}
                  </span>
                  <span className="text-sm text-slate-500">
                    · S/ {parseFloat(data.precio_noche).toFixed(2)} / noche
                  </span>
                </div>
              </section>

              {/* Timeline de estado */}
              <section className="px-5 py-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Estado de la estadía</h3>
                <div>
                  <TimelineStep
                    done={['confirmada', 'checked_in', 'checked_out'].includes(data.estado)}
                    active={data.estado === 'pendiente'}
                    label="Reserva Confirmada"
                    desc="Pago procesado y habitación asignada"
                  />
                  <TimelineStep
                    done={['checked_in', 'checked_out'].includes(data.estado)}
                    active={data.estado === 'confirmada'}
                    label="Check-in"
                    desc={`A partir del ${formatFecha(data.fecha_entrada)}`}
                  />
                  <TimelineStep
                    done={data.estado === 'checked_out'}
                    active={data.estado === 'checked_in'}
                    label="Estadía en curso"
                    desc={data.estado === 'checked_in' ? '¡Bienvenido! Disfruta tu estadía' : 'Durante tu estadía'}
                  />
                  <TimelineStep
                    done={data.estado === 'checked_out'}
                    active={false}
                    label="Check-out"
                    desc={`Antes de las 12:00 del ${formatFecha(data.fecha_salida)}`}
                  />
                </div>
              </section>

              {/* Consumos */}
              {data.consumos.length > 0 && (
                <section className="px-5 py-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Consumos ({data.consumos.length})
                  </h3>
                  <div className="divide-y divide-slate-50">
                    {data.consumos.map((c) => <ConsumoRow key={c.id} c={c} />)}
                  </div>
                </section>
              )}

              {/* Resumen de pago */}
              <section className="px-5 py-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Resumen de pago</h3>
                <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Alojamiento ({noches} noche{noches !== 1 ? 's' : ''})</span>
                    <span>S/ {totalBase.toFixed(2)}</span>
                  </div>
                  {totalConsumos > 0 && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Consumos</span>
                      <span>S/ {totalConsumos.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-slate-800">
                    <span>Total</span>
                    <span className="text-[#c5a255]">S/ {parseFloat(data.total).toFixed(2)}</span>
                  </div>
                  {data.metodo_pago && (
                    <p className="mt-2 text-xs text-slate-400">
                      {METODO_PAGO[data.metodo_pago] ?? data.metodo_pago}
                    </p>
                  )}
                </div>
              </section>

              {/* Notas */}
              {data.notas && (
                <section className="px-5 py-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Notas</h3>
                  <p className="rounded-xl bg-amber-50 p-3 text-sm italic text-slate-600 ring-1 ring-amber-100">{data.notas}</p>
                </section>
              )}

              {/* Spacer para footer */}
              <div className="h-24" />
            </div>
          )}
        </div>

        {/* Footer actions */}
        {data && esCancelable && (
          <div className="border-t border-slate-100 bg-white px-5 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
            {confirmarCancelar ? (
              <div className="space-y-3">
                <p className="text-center text-sm font-semibold text-slate-700">
                  ¿Confirmar cancelación de la reserva <span className="font-mono text-red-600">{data.codigo}</span>?
                </p>
                <p className="text-center text-xs text-slate-400">Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmarCancelar(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    disabled={cancelando}
                  >
                    No, mantener
                  </button>
                  <button
                    onClick={handleCancelar}
                    disabled={cancelando}
                    className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {cancelando ? 'Cancelando...' : 'Sí, cancelar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmarCancelar(true)}
                className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                Cancelar reserva
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
