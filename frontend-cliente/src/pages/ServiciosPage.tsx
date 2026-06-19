// ═══════════════════════════════════════════════════════════
// HotelFlux — Página de Servicios (Público) — Premium UI
// Catálogo completo con categorías visuales y experiencias
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { obtenerServicios, type ServicioCategoria } from '../services/publico.api';
import type { ReactNode } from 'react';
import { useI18n } from '../hooks/useI18n';

function IconMinibar({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M4 10h16" /><circle cx="12" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}
function IconRoomService({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 14h18M3 14a9 9 0 0018 0M12 5v4M9 5h6" />
    </svg>
  );
}
function IconSpa({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 22c-3-2-8-6-8-11a8 8 0 0116 0c0 5-5 9-8 11z" />
    </svg>
  );
}
function IconLaundry({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconGlobe({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  );
}
function IconParking({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 010 6H9" />
    </svg>
  );
}

export default function ServiciosPage() {
  const { t } = useI18n();

  // ── Config de categorías ──

  const CATEGORIA_INFO: Record<string, {
    label: string;
    icon: ReactNode;
    emoji: string;
    gradiente: string;
    textColor: string;
    desc: string;
    horario: string;
    highlight: string;
  }> = {
    minibar: {
      label: t('servicios.minibar'),
      icon: <IconMinibar size={26} />,
      emoji: '🍾',
      gradiente: 'from-purple-600 to-indigo-700',
      textColor: 'text-purple-700',
      desc: t('servicios.minibar_desc'),
      horario: t('servicios.minibar_horario'),
      highlight: t('servicios.minibar_highlight'),
    },
    room_service: {
      label: t('servicios.room_service'),
      icon: <IconRoomService size={26} />,
      emoji: '🍽️',
      gradiente: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-700',
      desc: t('servicios.room_service_desc'),
      horario: t('servicios.room_service_horario'),
      highlight: t('servicios.room_service_highlight'),
    },
    spa: {
      label: t('servicios.spa'),
      icon: <IconSpa size={26} />,
      emoji: '💆',
      gradiente: 'from-teal-500 to-emerald-600',
      textColor: 'text-teal-700',
      desc: t('servicios.spa_desc'),
      horario: t('servicios.spa_horario'),
      highlight: t('servicios.spa_highlight'),
    },
    lavanderia: {
      label: t('servicios.lavanderia'),
      icon: <IconLaundry size={26} />,
      emoji: '👔',
      gradiente: 'from-blue-500 to-cyan-600',
      textColor: 'text-blue-700',
      desc: t('servicios.lavanderia_desc'),
      horario: t('servicios.lavanderia_horario'),
      highlight: t('servicios.lavanderia_highlight'),
    },
    tour: {
      label: t('servicios.tours'),
      icon: <IconGlobe size={26} />,
      emoji: '🗺️',
      gradiente: 'from-green-500 to-emerald-600',
      textColor: 'text-green-700',
      desc: t('servicios.tours_desc'),
      horario: t('servicios.tours_horario'),
      highlight: t('servicios.tours_highlight'),
    },
    estacionamiento: {
      label: t('servicios.estacionamiento'),
      icon: <IconParking size={26} />,
      emoji: '🚗',
      gradiente: 'from-slate-600 to-slate-800',
      textColor: 'text-slate-700',
      desc: t('servicios.estacionamiento_desc'),
      horario: t('servicios.estacionamiento_horario'),
      highlight: t('servicios.estacionamiento_highlight'),
    },
  };

  const [servicios, setServicios] = useState<ServicioCategoria[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    obtenerServicios()
      .then((data) => setServicios(data))
      .catch(() => setServicios([]))
      .finally(() => setCargando(false));
  }, []);

  const categoriasOrden = ['room_service', 'spa', 'minibar', 'lavanderia', 'tour', 'estacionamiento'];
  const serviciosMapeados = categoriasOrden
    .map((cat) => servicios.find((s) => s.categoria === cat))
    .filter(Boolean) as ServicioCategoria[];

  // Asegura que categorías no conocidas también aparezcan
  const categoriasExtra = servicios.filter((s) => !categoriasOrden.includes(s.categoria));
  const todosServicios = [...serviciosMapeados, ...categoriasExtra];

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0c1d3d] py-16 sm:py-24">
        <div className="absolute inset-0 opacity-[0.05]">
          <svg className="h-full w-full" viewBox="0 0 1200 400">
            <defs><pattern id="sp" width="50" height="50" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1.5" fill="white"/></pattern></defs>
            <rect width="1200" height="400" fill="url(#sp)"/>
          </svg>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-12 bg-gradient-to-t from-[#faf8f5] to-transparent" />
        <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-[#c5a255]/10 blur-[70px]" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#c5a255]">{t('servicios.hero_tag')}</p>
          <h1 className="mb-5 text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl">
            {t('servicios.hero_title1')} <span className="text-[#c5a255]">{t('servicios.hero_title2')}</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
            {t('servicios.hero_desc')}
          </p>
          {/* Pills rápidos */}
          <div className="flex flex-wrap justify-center gap-2">
            {categoriasOrden.map((cat) => {
              const info = CATEGORIA_INFO[cat];
              return (
                <a key={cat} href={`#${cat}`}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm ring-1 ring-white/20 transition-all hover:bg-[#c5a255]/20 hover:ring-[#c5a255]/40">
                  <span>{info?.emoji}</span>{info?.label}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <div className="bg-[#faf8f5]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

          {/* Servicios incluidos gratis */}
          <div className="mb-14 rounded-3xl bg-gradient-to-br from-[#0c1d3d] to-[#142d5c] p-8 sm:p-10">
            <div className="mb-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#c5a255]">{t('servicios.incluido_tag')}</div>
            <h2 className="mb-8 text-center text-2xl font-bold text-white">{t('servicios.incluido_title')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: '🌐', title: 'WiFi Ultra 1Gbps', desc: 'Fibra óptica en todas las áreas' },
                { icon: '🔒', title: 'Caja Fuerte', desc: 'Digital en cada habitación' },
                { icon: '☕', title: 'Bienvenida Cortesía', desc: 'Café, té o infusión al llegar' },
                { icon: '🛎️', title: 'Concierge 24/7', desc: 'Atención personalizada' },
                { icon: '🏊', title: 'Piscina', desc: 'Climatizada todo el año' },
                { icon: '🏋️', title: 'Gimnasio 24h', desc: 'Equipamiento de última generación' },
                { icon: '👶', title: 'Family Friendly', desc: 'Cunas y kits infantiles' },
                { icon: '♿', title: 'Accesibilidad', desc: 'Habitaciones y zonas adaptadas' },
              ].map((s) => (
                <div key={s.title} className="flex items-start gap-3 rounded-xl bg-white/[0.05] p-4 ring-1 ring-white/10 transition-all hover:bg-white/10">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="text-xs text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categorías de servicios */}
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-[#c5a255]/20" />
                <div className="absolute inset-0 rounded-full border-4 border-[#c5a255] border-t-transparent animate-spin" />
              </div>
              <p className="text-sm text-slate-400 font-medium">{t('servicios.cargando')}</p>
            </div>
          ) : todosServicios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 text-5xl">🔧</div>
              <h3 className="text-lg font-semibold text-slate-700">{t('servicios.empty_title')}</h3>
              <p className="mt-1 text-sm text-slate-400">{t('servicios.empty_desc')}</p>
            </div>
          ) : (
          <div className="space-y-14">
            {todosServicios.map((cat) => {
              const info = CATEGORIA_INFO[cat.categoria] ?? {
                label: cat.categoria,
                icon: <IconRoomService size={26} />,
                emoji: '🏨',
                gradiente: 'from-slate-600 to-slate-800',
                textColor: 'text-slate-700',
                desc: '',
                horario: '',
                highlight: '',
              };

              return (
                <section key={cat.categoria} id={cat.categoria} className="scroll-mt-6">
                  {/* Header categoría */}
                  <div className={`mb-6 overflow-hidden rounded-2xl bg-gradient-to-r ${info.gradiente} p-6 text-white shadow-lg`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                          {info.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-extrabold">{info.emoji} {info.label}</h2>
                          </div>
                          <p className="text-sm text-white/70">{info.desc}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 text-right">
                        {info.horario && (
                          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{info.horario}</span>
                        )}
                        {info.highlight && (
                          <span className="text-xs font-medium text-white/70">{info.highlight}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Productos */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.productos.map((prod) => (
                      <div key={prod.id}
                        className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-[#c5a255]/30 hover:shadow-md">
                        {/* Acento top */}
                        <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${info.gradiente} opacity-0 transition-opacity group-hover:opacity-100`} />
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <h3 className="text-base font-bold text-slate-800 leading-tight">{prod.nombre}</h3>
                          <div className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-extrabold ${info.textColor} bg-slate-50 ring-1 ring-slate-200`}>
                            S/ {prod.precio}
                          </div>
                        </div>
                        {prod.descripcion && (
                          <p className="text-sm leading-relaxed text-slate-500">{prod.descripcion}</p>
                        )}
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{info.label}</span>
                          <Link to="/reservar"
                            className={`text-xs font-semibold ${info.textColor} transition-all hover:underline`}>
                            {t('servicios.solicitar')} →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          )}

          {/* CTA final */}
          <div className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-[#c5a255] to-[#e8d5a3] p-10 text-center shadow-xl">
            <h2 className="mb-3 text-3xl font-extrabold text-[#0c1d3d]">{t('servicios.cta_title')}</h2>
            <p className="mb-8 text-[#0c1d3d]/70">{t('servicios.cta_desc')}</p>
            <Link to="/reservar"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0c1d3d] px-8 py-4 text-base font-bold text-white shadow-xl shadow-[#0c1d3d]/30 transition-all hover:bg-[#142d5c] hover:shadow-2xl active:scale-[0.98]">
              🛏️ {t('servicios.cta_btn')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
