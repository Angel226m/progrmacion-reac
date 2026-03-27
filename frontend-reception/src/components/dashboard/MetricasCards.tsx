// ═══════════════════════════════════════════════════════════
// HotelFlux — MetricasCards (KPIs del dashboard)
// Componente funcional puro: solo recibe datos y renderiza
// ═══════════════════════════════════════════════════════════

import type { MetricasDashboard } from '../../domain/types';
import type { KPIs } from '../../streams/dashboard.stream';
import { IconChart, IconCheck, IconMoney, IconKey, IconLimpieza, IconTools } from '../shared/Icons';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface MetricasCardsProps {
  readonly metricas: MetricasDashboard;
  readonly kpis: KPIs;
}

// Función pura: definir tarjetas de métricas
interface MetricaCard {
  readonly label: string;
  readonly value: string | number;
  readonly icon: ReactNode;
  readonly color: string;
  readonly subtext?: string;
}

function buildCards(metricas: MetricasDashboard, kpis: KPIs): readonly MetricaCard[] {
  return [
    {
      label: 'Ocupación',
      value: `${metricas.porcentaje_ocupacion.toFixed(1)}%`,
      icon: <IconChart size={20} className="text-blue-500" />,
      color: 'from-blue-500 to-blue-600',
      subtext: `${metricas.ocupadas} de ${metricas.total_habitaciones}`,
    },
    {
      label: 'Disponibles',
      value: metricas.disponibles,
      icon: <IconCheck size={20} className="text-emerald-500" />,
      color: 'from-emerald-500 to-emerald-600',
      subtext: 'habitaciones libres',
    },
    {
      label: 'Ingresos Hoy',
      value: `$${parseFloat(metricas.ingresos_hoy || '0').toLocaleString()}`,
      icon: <IconMoney size={20} className="text-amber-500" />,
      color: 'from-amber-500 to-amber-600',
      subtext: `RevPAR: $${kpis.revpar.toFixed(2)}`,
    },
    {
      label: 'Check-Ins Hoy',
      value: metricas.checkins_hoy,
      icon: <IconKey size={20} className="text-cyan-500" />,
      color: 'from-cyan-500 to-cyan-600',
      subtext: `Check-outs: ${metricas.checkouts_hoy}`,
    },
    {
      label: 'En Limpieza',
      value: metricas.en_limpieza,
      icon: <IconLimpieza size={20} className="text-yellow-500" />,
      color: 'from-yellow-500 to-yellow-600',
      subtext: `Prom: ${metricas.promedio_limpieza_min.toFixed(0)} min`,
    },
    {
      label: 'Mantenimiento',
      value: metricas.en_mantenimiento,
      icon: <IconTools size={20} className="text-purple-500" />,
      color: 'from-purple-500 to-purple-600',
      subtext: 'habitaciones',
    },
  ];
}

export default function MetricasCards({ metricas, kpis }: MetricasCardsProps) {
  const cards = buildCards(metricas, kpis);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-2xl">{card.icon}</span>
            <span
              className={clsx(
                'rounded-full bg-gradient-to-r px-2.5 py-0.5 text-xs font-bold text-white',
                card.color,
              )}
            >
              {card.value}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-700">{card.label}</p>
          {card.subtext && (
            <p className="text-xs text-slate-500">{card.subtext}</p>
          )}
        </div>
      ))}
    </div>
  );
}
