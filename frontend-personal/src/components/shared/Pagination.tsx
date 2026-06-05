// ═══════════════════════════════════════════════════════════
// HotelFlux — Pagination (componente compartido)
// Reutilizable: tabla, grid o timeline. Colores configurables.
// Features: "…" inteligente, scroll-to-top, animación, responsive.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import clsx from 'clsx';

export type ColorScheme = 'violet' | 'blue' | 'amber' | 'purple' | 'slate' | 'emerald';

const COLORS: Record<ColorScheme, { active: string; ring: string }> = {
  violet:  { active: 'bg-violet-600 text-white shadow-sm',           ring: 'ring-slate-200' },
  blue:    { active: 'bg-blue-600 text-white shadow-sm',             ring: 'ring-slate-200' },
  amber:   { active: 'bg-amber-500 text-white shadow-sm',            ring: 'ring-slate-200' },
  purple:  { active: 'bg-purple-600 text-white shadow-sm',           ring: 'ring-slate-200' },
  slate:   { active: 'bg-[#0c1d3d] text-[#c5a255] shadow-sm',        ring: 'ring-slate-200' },
  emerald: { active: 'bg-emerald-600 text-white shadow-sm',          ring: 'ring-slate-200' },
};

interface PaginationProps {
  /** Página actual (1-indexed) */
  pagina: number;
  /** Setter de página actual */
  setPagina: (n: number) => void;
  /** Total de items después de filtrar */
  total: number;
  /** Items por página */
  porPagina: number;
  /** Color del botón activo */
  color?: ColorScheme;
  /** Etiqueta del singular ("reserva", "huésped", "tarea", ...) */
  itemLabel: string;
  /** Plural para mostrar en el resumen */
  itemLabelPlural?: string;
  /** Scroll al top de la lista al cambiar de página */
  scrollTarget?: React.RefObject<HTMLElement | null>;
  /** Tamaño compacto (menos padding) */
  compacta?: boolean;
}

// Genera la lista de páginas con "…" inteligente:
//   [1] … [n-1] [n] [n+1] … [total]
function generarPaginas(pagina: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const result: (number | '…')[] = [];
  const set = new Set<number>([1, total, pagina, pagina - 1, pagina + 1]);
  for (let n = 1; n <= total; n++) if (set.has(n)) result.push(n);

  // Insertar "…" entre huecos
  const conSep: (number | '…')[] = [];
  result.forEach((n, i) => {
    if (i > 0) {
      const prev = result[i - 1];
      if (prev !== '…' && (n as number) - (prev as number) > 1) conSep.push('…');
    }
    conSep.push(n);
  });
  return conSep;
}

export default function Pagination({
  pagina,
  setPagina,
  total,
  porPagina,
  color = 'violet',
  itemLabel,
  itemLabelPlural,
  scrollTarget,
  compacta = false,
}: PaginationProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaActual = Math.min(Math.max(1, pagina), totalPaginas);
  const colors = COLORS[color];
  const label = itemLabelPlural ?? (itemLabel + (total !== 1 ? 's' : ''));

  // Auto-corregir si el filtro deja la página actual fuera de rango
  const lastValidPage = useRef(paginaActual);
  useEffect(() => {
    if (pagina > totalPaginas && total > 0) {
      lastValidPage.current = 1;
      setPagina(1);
    }
  }, [pagina, totalPaginas, total, setPagina]);

  if (total === 0) return null;

  const cambiarPagina = (n: number) => {
    if (n < 1 || n > totalPaginas || n === paginaActual) return;
    setPagina(n);
    if (scrollTarget?.current) {
      scrollTarget.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const inicio = (paginaActual - 1) * porPagina + 1;
  const fin = Math.min(paginaActual * porPagina, total);
  const paginas = generarPaginas(paginaActual, totalPaginas);
  const py = compacta ? 'py-2' : 'py-3';
  const btnSize = compacta ? 'min-w-[1.75rem] px-2 py-1 text-[11px]' : 'min-w-[2rem] px-2.5 py-1.5 text-xs';

  return (
    <div
      className={clsx(
        'flex flex-col items-stretch justify-between gap-2 border-t border-slate-100 px-3 sm:px-4 sm:flex-row sm:items-center',
        py,
      )}
    >
      <p className="text-[11px] text-slate-500 sm:text-xs">
        {total === 0 ? (
          <>Sin {label}</>
        ) : (
          <>
            <span className="hidden sm:inline">Mostrando </span>
            <span className="font-semibold text-slate-700">{inicio}–{fin}</span>
            <span className="hidden sm:inline"> de </span>
            <span className="sm:hidden">/ </span>
            <span className="font-semibold text-slate-700">{total}</span>
            <span className="hidden sm:inline"> {label}</span>
          </>
        )}
      </p>

      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => cambiarPagina(paginaActual - 1)}
          disabled={paginaActual === 1}
          aria-label="Página anterior"
          className={clsx(
            'rounded-lg font-medium transition-all ring-1',
            btnSize,
            colors.ring,
            'text-slate-600 hover:bg-slate-50 active:scale-95',
            'disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent',
          )}
        >
          ‹
        </button>

        {paginas.map((p, i) =>
          p === '…' ? (
            <span
              key={`sep-${i}`}
              className={clsx('px-1 text-slate-400 select-none', compacta ? 'text-xs' : 'text-xs')}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => cambiarPagina(p)}
              aria-current={p === paginaActual ? 'page' : undefined}
              className={clsx(
                'rounded-lg font-medium transition-all ring-1',
                btnSize,
                p === paginaActual
                  ? colors.active
                  : `${colors.ring} text-slate-600 hover:bg-slate-50 active:scale-95`,
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => cambiarPagina(paginaActual + 1)}
          disabled={paginaActual === totalPaginas}
          aria-label="Página siguiente"
          className={clsx(
            'rounded-lg font-medium transition-all ring-1',
            btnSize,
            colors.ring,
            'text-slate-600 hover:bg-slate-50 active:scale-95',
            'disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent',
          )}
        >
          ›
        </button>
      </div>
    </div>
  );
}
