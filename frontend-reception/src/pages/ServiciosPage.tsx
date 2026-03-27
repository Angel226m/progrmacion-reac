// ═══════════════════════════════════════════════════════════
// HotelFlux — Página de Servicios (Público)
// Catálogo completo de servicios del hotel
// Responsive: PC, tablet, laptop, celular
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { obtenerServicios, type ServicioCategoria } from '../services/publico.api';
import { IconRoomService, IconSpa, IconGlobe } from '../components/shared/Icons';
import type { ReactNode } from 'react';

// ── Iconos de categoría ──

function IconMinibar({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M4 10h16" />
      <circle cx="12" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

function IconLaundry({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 4V2M18 4V2" />
    </svg>
  );
}

function IconParking({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </svg>
  );
}

const CATEGORIA_INFO: Record<string, { label: string; icon: ReactNode; color: string; desc: string }> = {
  minibar: {
    label: 'Minibar',
    icon: <IconMinibar size={28} />,
    color: 'from-purple-500 to-purple-600',
    desc: 'Selección premium de bebidas y snacks en la comodidad de su habitación.',
  },
  room_service: {
    label: 'Room Service',
    icon: <IconRoomService size={28} />,
    color: 'from-amber-500 to-orange-500',
    desc: 'Gastronomía de autor disponible las 24 horas. Pedidos directos a su habitación.',
  },
  spa: {
    label: 'Spa & Bienestar',
    icon: <IconSpa size={28} />,
    color: 'from-teal-500 to-emerald-500',
    desc: 'Tratamientos de relajación, masajes terapéuticos y circuito de hidroterapia.',
  },
  lavanderia: {
    label: 'Lavandería',
    icon: <IconLaundry size={28} />,
    color: 'from-blue-500 to-cyan-500',
    desc: 'Servicio de lavandería express. Su ropa impecable en el mismo día.',
  },
  tour: {
    label: 'Tours & Excursiones',
    icon: <IconGlobe size={28} />,
    color: 'from-green-500 to-emerald-500',
    desc: 'Descubra los mejores destinos locales con guías turísticos certificados.',
  },
  estacionamiento: {
    label: 'Estacionamiento',
    icon: <IconParking size={28} />,
    color: 'from-slate-500 to-slate-600',
    desc: 'Estacionamiento techado y vigilado con servicio de valet parking.',
  },
};

// ── Datos de fallback ──

const SERVICIOS_FALLBACK: ServicioCategoria[] = [
  {
    categoria: 'room_service',
    productos: [
      { id: 'p1', nombre: 'Club Sandwich', descripcion: 'Sandwich club con papas fritas', precio: '15.00' },
      { id: 'p2', nombre: 'Hamburguesa Premium', descripcion: 'Hamburguesa angus 200g con guarnición', precio: '18.00' },
      { id: 'p3', nombre: 'Ensalada César', descripcion: 'Ensalada César con pollo a la parrilla', precio: '12.00' },
    ],
  },
  {
    categoria: 'spa',
    productos: [
      { id: 'p4', nombre: 'Masaje Relajante', descripcion: 'Masaje corporal completo 60 minutos', precio: '80.00' },
      { id: 'p5', nombre: 'Facial Premium', descripcion: 'Tratamiento facial rejuvenecedor 45 min', precio: '65.00' },
    ],
  },
  {
    categoria: 'minibar',
    productos: [
      { id: 'p6', nombre: 'Agua Mineral', descripcion: 'Agua mineral 500ml', precio: '3.50' },
      { id: 'p7', nombre: 'Cerveza Artesanal', descripcion: 'Cerveza local IPA', precio: '8.50' },
      { id: 'p8', nombre: 'Vino Tinto Reserva', descripcion: 'Vino tinto reserva especial', precio: '25.00' },
    ],
  },
  {
    categoria: 'lavanderia',
    productos: [
      { id: 'p9', nombre: 'Lavado Express', descripcion: 'Lavado y planchado mismo día', precio: '12.00' },
    ],
  },
  {
    categoria: 'tour',
    productos: [
      { id: 'p10', nombre: 'Tour Ciudad', descripcion: 'Tour guiado de 3 horas por la ciudad', precio: '45.00' },
    ],
  },
  {
    categoria: 'estacionamiento',
    productos: [
      { id: 'p11', nombre: 'Estacionamiento / día', descripcion: 'Estacionamiento cubierto 24h', precio: '15.00' },
    ],
  },
];

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<ServicioCategoria[]>(SERVICIOS_FALLBACK);

  useEffect(() => {
    obtenerServicios()
      .then((data) => {
        if (data.length > 0) setServicios(data);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0c1d3d] py-12 sm:py-16">
        <div className="absolute inset-0 opacity-[0.04]"><svg className="h-full w-full" viewBox="0 0 1200 300"><defs><pattern id="sg" width="50" height="50" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white"/></pattern></defs><rect width="1200" height="300" fill="url(#sg)"/></svg></div>
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a255]/50 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c5a255]">Experiencias</p>
          <h1 className="mb-3 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">Servicios & Amenidades</h1>
          <p className="mx-auto max-w-2xl text-slate-400">
            Todo lo que necesita para una estadía inolvidable. Desde gastronomía gourmet hasta tratamientos de spa,
            tenemos todo pensado para su confort.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        {/* Grid de categorías */}
        <div className="space-y-12">
          {servicios.map((cat) => {
            const info = CATEGORIA_INFO[cat.categoria] ?? {
              label: cat.categoria,
              icon: <IconRoomService size={28} />,
              color: 'from-slate-500 to-slate-600',
              desc: '',
            };

            return (
              <section key={cat.categoria} className="scroll-mt-20" id={cat.categoria}>
                {/* Encabezado de categoría */}
                <div className="mb-6 flex items-start gap-4 sm:items-center">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${info.color} text-white shadow-lg`}>
                    {info.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">{info.label}</h2>
                    {info.desc && <p className="mt-1 text-sm text-slate-500">{info.desc}</p>}
                  </div>
                </div>

                {/* Productos */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.productos.map((prod) => (
                    <div
                      key={prod.id}
                      className="luxury-card group rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <h3 className="text-base font-semibold text-slate-800">{prod.nombre}</h3>
                        <span className="shrink-0 rounded-full bg-[#c5a255]/10 px-3 py-1 text-sm font-bold text-[#c5a255]">
                          S/ {prod.precio}
                        </span>
                      </div>
                      {prod.descripcion && (
                        <p className="text-sm leading-relaxed text-slate-500">{prod.descripcion}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Servicios adicionales visuales */}
        <section className="mt-16 rounded-2xl bg-[#faf8f5] p-6 sm:p-10">
          <h2 className="section-divider mb-8 text-center text-2xl font-bold text-slate-800">También incluido en su estadía</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: '🌐', label: 'WiFi Ultra Rápido', desc: 'Fibra óptica en todas las áreas' },
              { icon: '🔒', label: 'Caja Fuerte', desc: 'Digital en cada habitación' },
              { icon: '☕', label: 'Café de Bienvenida', desc: 'Café o infusión cortesía' },
              { icon: '🛎️', label: 'Concierge 24/7', desc: 'Asistencia personalizada' },
              { icon: '🏊', label: 'Piscina', desc: 'Climatizada todo el año' },
              { icon: '🏋️', label: 'Gimnasio', desc: 'Equipamiento moderno 24h' },
              { icon: '👶', label: 'Family Friendly', desc: 'Cunas y kits infantiles' },
              { icon: '♿', label: 'Accesibilidad', desc: 'Habitaciones adaptadas' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-[#c5a255]/20 hover:shadow-md">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="mb-4 text-slate-500">¿Le interesa alguno de nuestros servicios?</p>
          <Link
            to="/reservar"
            className="btn-gold inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base shadow-lg"
          >
            Reservar y agregar servicios
          </Link>
        </div>
      </div>
    </>
  );
}
