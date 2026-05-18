// ═══════════════════════════════════════════════════════════
// HotelFlux — Página de Inicio (Landing Luxury Premium)
// Diseño: Four Seasons / Aman / Ritz-Carlton inspired
// Paleta: Navy #0c1d3d + Gold #c5a255 + White
// Responsive: PC, tablet, laptop, celular
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { obtenerInfoHotel, obtenerTiposHabitacion, type InfoHotel, type TipoHabitacionInfo } from '../services/publico.api';
import { IconBed, IconBedDouble, IconCrown, IconStar, IconRoomService, IconSpa, IconGlobe } from '../components/shared/Icons';
import type { ReactNode } from 'react';

// ── SVG Icons ──

function IconShield({ size = 24 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
}
function IconWifi({ size = 24 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" /></svg>);
}
function IconCar({ size = 24 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" /><path d="M9 17h6" /></svg>);
}
function IconCalendar({ size = 24 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>);
}
function IconCheck({ size = 20 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>);
}
function IconArrow({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>);
}
function IconQuote({ size = 32 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" opacity="0.1"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.7 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.288 0-2.46-.6-2.917-1.179zM15.583 17.321C14.553 16.227 14 15 14 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C20.591 11.7 22 13.166 22 15c0 1.933-1.567 3.5-3.5 3.5-1.288 0-2.46-.6-2.917-1.179z" /></svg>);
}

// ── Hook de aparición al scroll ──

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── Encabezado de sección (reutilizable) ──

function SectionHeading({ tag, titulo, subtitulo }: { tag: string; titulo: string; subtitulo?: string }) {
  return (
    <div className="mb-14 text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c5a255]">{tag}</p>
      <h2 className="section-divider mx-auto mb-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">
        {titulo}
      </h2>
      {subtitulo && <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-500">{subtitulo}</p>}
    </div>
  );
}

// ── Feature Card ──

function FeatureCard({ icon, titulo, descripcion, delay }: { icon: ReactNode; titulo: string; descripcion: string; delay: number }) {
  return (
    <div
      className="luxury-card group rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0c1d3d]/5 text-[#c5a255] transition-colors duration-300 group-hover:bg-[#0c1d3d] group-hover:text-[#e8d5a3]">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-800">{titulo}</h3>
      <p className="text-sm leading-relaxed text-slate-500">{descripcion}</p>
    </div>
  );
}

// ── Room Type Card ──

function TipoHabCard({ tipo, delay }: { tipo: TipoHabitacionInfo; delay: number }) {
  const icono = tipo.tipo === 'simple' ? <IconBed size={36} /> :
                tipo.tipo === 'doble' ? <IconBedDouble size={36} /> :
                tipo.tipo === 'suite' ? <IconStar size={36} /> :
                <IconCrown size={36} />;

  const nombres: Record<string, string> = { simple: 'Clásica', doble: 'Superior', suite: 'Suite', presidencial: 'Presidencial' };
  const capacidades: Record<string, string> = { simple: '1-2 huéspedes', doble: '2-3 huéspedes', suite: '2-4 huéspedes', presidencial: '2-6 huéspedes' };

  return (
    <div className="luxury-card group relative overflow-hidden rounded-2xl border border-slate-100 bg-white animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      {/* Imagen placeholder premium */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-[#0c1d3d] via-[#142d5c] to-[#1a3a6e] sm:h-60">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 400 280">
            <defs>
              <pattern id={`lux-${tipo.tipo}`} width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M25 0v50M0 25h50" stroke="white" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="400" height="280" fill={`url(#lux-${tipo.tipo})`} />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-center text-[#c5a255]/70 transition-transform duration-500 group-hover:scale-110">
          {icono}
        </div>
        {/* Badge */}
        {tipo.disponibles > 0 ? (
          <span className="absolute left-4 top-4 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm">
            {tipo.disponibles} disponible{tipo.disponibles > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="absolute left-4 top-4 rounded-full bg-red-500/90 px-3 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm">
            Agotado
          </span>
        )}
        {/* Gold line bottom */}
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a255] to-transparent" />
      </div>
      <div className="p-5 sm:p-6">
        <h3 className="mb-1 text-xl font-bold text-slate-800">{nombres[tipo.tipo] ?? tipo.tipo}</h3>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">{capacidades[tipo.tipo] ?? ''}</p>
        {tipo.precio_desde && (
          <div className="mb-4">
            <span className="text-xs text-slate-400">Desde</span>
            <span className="ml-1 text-2xl font-extrabold text-[#0c1d3d]">S/ {tipo.precio_desde}</span>
            <span className="text-sm text-slate-400"> / noche</span>
          </div>
        )}
        <Link to="/reservar" className="btn-gold block rounded-xl py-3 text-center text-sm shadow-md">
          Reservar Ahora
        </Link>
      </div>
    </div>
  );
}

// ── Testimonios ──

const TESTIMONIOS = [
  { nombre: 'María García', ubicacion: 'Lima, Perú', texto: 'Increíble experiencia. El servicio es impecable y las habitaciones son exactamente como las muestran. Volveremos sin duda.', rating: 5 },
  { nombre: 'Carlos Rodriguez', ubicacion: 'Arequipa, Perú', texto: 'La mejor relación calidad-precio. El check-in fue rapidísimo y el personal muy atento. La suite con jacuzzi es espectacular.', rating: 5 },
  { nombre: 'Ana Martínez', ubicacion: 'Cusco, Perú', texto: 'Perfecto para viajes de negocios. WiFi excelente, room service rápido y la ubicación es inmejorable.', rating: 4 },
] as const;

// ── Animated Counter ──

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        let start = 0;
        const step = Math.max(1, Math.ceil(target / 40));
        const id = setInterval(() => { start = Math.min(start + step, target); setVal(start); if (start >= target) clearInterval(id); }, 30);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ═══════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════

export default function InicioPage() {
  const [_info, setInfo] = useState<InfoHotel | null>(null);
  const [tipos, setTipos] = useState<TipoHabitacionInfo[]>([]);
  const secRooms = useInView();
  const secServices = useInView();
  const secWhy = useInView();
  const secTestimonials = useInView();

  useEffect(() => {
    obtenerInfoHotel().then(setInfo).catch(() => {});
    obtenerTiposHabitacion().then(setTipos).catch(() => {});
  }, []);

  return (
    <>
      {/* ══════ HERO — Full-viewport Luxury ══════ */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-[#0c1d3d]">
        {/* Background layers */}
        <div className="absolute inset-0">
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.04]">
            <svg className="h-full w-full" viewBox="0 0 1400 700">
              <defs><pattern id="hg" width="70" height="70" patternUnits="userSpaceOnUse"><path d="M70 0L0 0 0 70" fill="none" stroke="white" strokeWidth="0.4"/></pattern></defs>
              <rect width="1400" height="700" fill="url(#hg)"/>
            </svg>
          </div>
          {/* Glow orbs */}
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#c5a255]/8 blur-[120px]" />
          <div className="absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full bg-[#c5a255]/5 blur-[100px]" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-white/[0.02] blur-[80px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — Copy */}
            <div className="animate-fade-in-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c5a255]/30 bg-[#c5a255]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#e8d5a3] backdrop-blur-sm">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c5a255] animate-gold-pulse" />
                Bienvenido a HotelFlux
              </div>
              <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-[4rem]">
                Donde el lujo
                <span className="mt-1 block bg-gradient-to-r from-[#c5a255] via-[#e8d5a3] to-[#c5a255] bg-clip-text text-transparent">
                  se hace arte
                </span>
              </h1>
              <p className="mb-10 max-w-lg text-lg leading-relaxed text-slate-400 sm:text-xl">
                Descubra la armonía perfecta entre confort atemporal, gastronomía de autor y un servicio que anticipa cada deseo.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link to="/reservar" className="btn-gold inline-flex items-center justify-center gap-2.5 rounded-xl px-9 py-4 text-base shadow-xl">
                  <IconCalendar size={20} />
                  Reservar Ahora
                </Link>
                <Link to="/habitaciones" className="btn-navy inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base">
                  Explorar Suites
                </Link>
              </div>

              {/* Trust signals */}
              <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/[0.06] pt-7">
                {[
                  { icon: <IconShield size={16} />, text: 'Pago 100% seguro' },
                  { icon: <IconCheck size={16} />, text: 'Cancelación gratuita 48h' },
                  { icon: <IconWifi size={16} />, text: 'WiFi alta velocidad' },
                  { icon: <IconCar size={16} />, text: 'Parking incluido' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13px] text-slate-500">
                    <span className="text-[#c5a255]/60">{s.icon}</span>{s.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Stats glass panel */}
            <div className="hidden lg:flex lg:justify-end">
              <div className="glass-dark w-full max-w-sm rounded-3xl p-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="text-center">
                  <p className="text-6xl font-extrabold text-white"><Counter target={98} suffix="%" /></p>
                  <p className="mt-2 text-sm font-medium text-[#c5a255]">Satisfacción del huésped</p>
                </div>
                <div className="my-6 h-px bg-white/10" />
                <div className="grid grid-cols-2 gap-5">
                  {[
                    { n: 12, s: '+', label: 'Tipos de habitación' },
                    { n: 24, s: '/7', label: 'Servicio continuo' },
                    { n: 50, s: '+', label: 'Servicios disponibles' },
                    { n: 5, s: '★', label: 'Calificación' },
                  ].map((st, i) => (
                    <div key={i} className="text-center">
                      <p className="text-2xl font-bold text-white"><Counter target={st.n} suffix={st.s} /></p>
                      <p className="mt-0.5 text-xs text-slate-500">{st.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gold accent line */}
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a255]/50 to-transparent" />
      </section>

      {/* ══════ HABITACIONES ══════ */}
      <section ref={secRooms.ref} className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        {secRooms.visible && (
          <>
            <SectionHeading
              tag="Nuestras Habitaciones"
              titulo="Elegancia en cada detalle"
              subtitulo="Desde acogedoras habitaciones clásicas hasta el Penthouse con terraza panorámica. Encuentre el refugio perfecto."
            />

            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {(tipos.length > 0 ? tipos : (['simple', 'doble', 'suite', 'presidencial'] as const).map((tipo) => ({
                tipo,
                cantidad_total: 0,
                disponibles: tipo === 'simple' ? 3 : tipo === 'doble' ? 4 : tipo === 'suite' ? 2 : 1,
                precio_desde: tipo === 'simple' ? '85.00' : tipo === 'doble' ? '120.00' : tipo === 'suite' ? '240.00' : '450.00',
                precio_hasta: null,
              }))).map((t, i) => (
                <TipoHabCard key={t.tipo} tipo={t} delay={i * 100} />
              ))}
            </div>

            <div className="mt-12 text-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <Link to="/habitaciones" className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-[#0c1d3d] shadow-sm transition-all hover:border-[#c5a255] hover:shadow-md">
                Ver todas las habitaciones
                <IconArrow size={14} />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* ══════ SERVICIOS ══════ */}
      <section ref={secServices.ref} className="bg-[#faf8f5] py-20 sm:py-24 lg:py-28">
        {secServices.visible && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading tag="Servicios Premium" titulo="Todo lo que necesita, y más" />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: <IconRoomService size={24} />, titulo: 'Room Service 24/7', desc: 'Gastronomía de autor en la comodidad de su habitación. Menú completo las 24 horas.' },
                { icon: <IconSpa size={24} />, titulo: 'Spa & Bienestar', desc: 'Masajes, tratamientos faciales y circuito de hidroterapia. Renueve cuerpo y mente.' },
                { icon: <IconWifi size={24} />, titulo: 'WiFi Ultra Rápido', desc: 'Fibra óptica en todas las áreas. Ideal para trabajo remoto y streaming HD.' },
                { icon: <IconCar size={24} />, titulo: 'Valet Parking', desc: 'Estacionamiento cubierto y vigilado 24/7. Servicio de valet parking incluido.' },
                { icon: <IconGlobe size={24} />, titulo: 'Tours & Excursiones', desc: 'Tours guiados culturales, gastronómicos y de aventura por la ciudad.' },
                { icon: <IconShield size={24} />, titulo: 'Seguridad Total', desc: 'Tarjeta electrónica, CCTV 24/7, caja fuerte y personal de seguridad.' },
              ].map((s, i) => (
                <FeatureCard key={i} icon={s.icon} titulo={s.titulo} descripcion={s.desc} delay={i * 80} />
              ))}
            </div>

            <div className="mt-12 text-center animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <Link to="/servicios" className="group inline-flex items-center gap-2 text-sm font-semibold text-[#c5a255] transition-colors hover:text-[#0c1d3d]">
                Ver todos los servicios <IconArrow size={14} />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ══════ POR QUÉ ELEGIRNOS ══════ */}
      <section ref={secWhy.ref} className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        {secWhy.visible && (
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="animate-fade-in-up">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c5a255]">¿Por qué HotelFlux?</p>
              <h2 className="mb-8 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Una experiencia que<br />marca la diferencia
              </h2>
              <ul className="space-y-5">
                {[
                  'Ubicación privilegiada en Miraflores, Lima',
                  'Check-in digital y control inteligente de habitación',
                  'Programa de lealtad con beneficios exclusivos',
                  'Gastronomía de autor con ingredientes orgánicos locales',
                  'Personal bilingüe certificado en hospitalidad',
                  'Certificación ISO 9001 en calidad de servicio',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c5a255]/10 text-[#c5a255]">
                      <IconCheck size={14} />
                    </span>
                    <span className="text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats panel (mobile visible here) */}
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="rounded-3xl bg-gradient-to-br from-[#0c1d3d] to-[#142d5c] p-8 text-white sm:p-12">
                <div className="space-y-6 text-center">
                  <div>
                    <p className="text-5xl font-extrabold"><Counter target={98} suffix="%" /></p>
                    <p className="mt-1 text-sm text-[#c5a255]">Satisfacción del huésped</p>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { n: 12, s: '+', l: 'Tipos de habitación' },
                      { n: 24, s: '/7', l: 'Servicio continuo' },
                      { n: 50, s: '+', l: 'Servicios disponibles' },
                      { n: 5, s: '★', l: 'Calificación promedio' },
                    ].map((st, i) => (
                      <div key={i}>
                        <p className="text-3xl font-bold"><Counter target={st.n} suffix={st.s} /></p>
                        <p className="text-sm text-slate-400">{st.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══════ TESTIMONIOS ══════ */}
      <section ref={secTestimonials.ref} className="bg-[#faf8f5] py-20 sm:py-24 lg:py-28">
        {secTestimonials.visible && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading tag="Testimonios" titulo="Lo que dicen nuestros huéspedes" />

            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIOS.map((t, i) => (
                <div
                  key={i}
                  className="luxury-card relative rounded-2xl border border-slate-100 bg-white p-7 sm:p-8 animate-fade-in-up"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="absolute right-6 top-6 text-[#c5a255]"><IconQuote size={36} /></div>
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: 5 }, (_, j) => (
                      <svg key={j} className={`h-4 w-4 ${j < t.rating ? 'text-[#c5a255]' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mb-5 text-sm leading-relaxed text-slate-600 italic">"{t.texto}"</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0c1d3d]/5 text-sm font-bold text-[#0c1d3d]">
                      {t.nombre.split(' ').map(w => w[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{t.nombre}</p>
                      <p className="text-xs text-slate-400">{t.ubicacion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ══════ CTA FINAL ══════ */}
      <section className="relative overflow-hidden bg-[#0c1d3d] py-20 sm:py-24">
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="h-full w-full" viewBox="0 0 1200 400"><defs><pattern id="cta-d" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="white"/></pattern></defs><rect fill="url(#cta-d)" width="100%" height="100%"/></svg>
        </div>
        <div className="absolute left-1/2 top-0 h-[2px] w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#c5a255]/40 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#c5a255]">Reservas</p>
          <h2 className="mb-5 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            ¿Listo para vivir la experiencia?
          </h2>
          <p className="mb-10 text-lg text-slate-400">
            Tarifas preferenciales y upgrade cortesía para reservas directas.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/reservar" className="btn-gold inline-flex items-center justify-center gap-2.5 rounded-xl px-10 py-4 text-base shadow-xl">
              <IconCalendar size={20} />
              Reservar Ahora
            </Link>
            <a href="tel:+5115550100" className="btn-navy inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base">
              Llamar: +51 (1) 555-0100
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
