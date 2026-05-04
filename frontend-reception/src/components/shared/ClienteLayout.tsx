// ═══════════════════════════════════════════════════════════
// HotelFlux — Layout Público Premium para Clientes
// Navbar con efecto scroll + Footer luxury
// Diseño: Four Seasons / Aman inspired
// Responsive: PC, tablet, laptop, celular
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import CookieConsent from './CookieConsent';
import clsx from 'clsx';

// ── SVG Icons ──

function IconMenu({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function IconX({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconUser({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" /><path d="M5.5 21c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
    </svg>
  );
}

function IconPhone({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconMail({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconMapPin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

const NAV_LINKS = [
  { path: '/', label: 'Inicio', exact: true },
  { path: '/habitaciones', label: 'Habitaciones', exact: false },
  { path: '/servicios', label: 'Servicios', exact: false },
  { path: '/reservar', label: 'Reservar', exact: false },
] as const;

export default function ClienteLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = location.pathname === '/';

  // Navbar transparente→sólida en scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cerrar menú al navegar
  useEffect(() => { setMenuAbierto(false); }, [location.pathname]);

  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  const navbarSolid = scrolled || !isHome || menuAbierto;
  // En home sin scroll: fondo oscuro (navy) para que los links blancos sean visibles
  const navbarDark = isHome && !scrolled && !menuAbierto;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ══════ Top Bar (desktop only) ══════ */}
      <div className={clsx(
        'hidden border-b text-xs transition-all duration-300 lg:block',
        navbarSolid
          ? 'border-slate-100 bg-slate-50 text-slate-500'
          : navbarDark
            ? 'border-white/10 bg-[#0c1d3d] text-white/60'
            : 'border-white/10 bg-transparent text-white/60',
      )}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><IconPhone size={12} /> +51 (1) 555-0100</span>
            <span className="flex items-center gap-1.5"><IconMail size={12} /> reservas@hotelflux.pe</span>
          </div>
          <span className="tracking-wide">Check-in 14:00 &middot; Check-out 12:00</span>
        </div>
      </div>

      {/* ══════ Navbar Principal ══════ */}
      <header className={clsx(
        'sticky top-0 z-50 transition-all duration-500',
        navbarSolid
          ? 'border-b border-slate-200/60 bg-white/95 shadow-sm backdrop-blur-xl'
          : navbarDark
            ? 'bg-[#0c1d3d]'
            : 'bg-transparent',
      )}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80" onClick={cerrarMenu}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#c5a255] to-[#e8d5a3] shadow-md">
              <span className="text-xl font-black text-[#0c1d3d]">H</span>
            </div>
            <div className="hidden sm:block">
              <span className={clsx(
                'text-lg font-extrabold tracking-tight transition-colors',
                navbarSolid ? 'text-slate-800' : 'text-white',
              )}>HotelFlux</span>
              <span className={clsx(
                'ml-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors',
                navbarSolid ? 'text-[#c5a255]' : 'text-[#e8d5a3]',
              )}>Luxury Hotel & Spa</span>
            </div>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.exact}
                className={({ isActive }) =>
                  clsx(
                    'relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? navbarSolid ? 'text-[#0c1d3d]' : 'text-white'
                      : navbarSolid ? 'text-slate-500 hover:text-slate-800' : 'text-white/70 hover:text-white',
                    isActive && 'after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:w-5 after:rounded-full after:bg-[#c5a255]',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Auth area desktop */}
          <div className="hidden items-center gap-2 md:flex">
            {usuario ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/mi-cuenta"
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    navbarSolid ? 'text-slate-600 hover:bg-slate-50' : 'text-white/80 hover:bg-white/10',
                  )}
                >
                  <IconUser size={16} />
                  <span className="max-w-[100px] truncate">{usuario.nombre}</span>
                </Link>
                {(usuario.rol === 'admin' || usuario.rol === 'recepcionista') && (
                  <Link
                    to="/admin"
                    className={clsx(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                      navbarSolid
                        ? 'border-slate-200 text-slate-500 hover:border-[#c5a255] hover:text-[#c5a255]'
                        : 'border-white/20 text-white/70 hover:border-white/40 hover:text-white',
                    )}
                  >
                    Panel
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className={clsx(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    navbarSolid ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-white/50 hover:text-white',
                  )}
                >
                  Salir
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/acceso"
                  className={clsx(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    navbarSolid ? 'text-slate-600 hover:text-slate-800' : 'text-white/80 hover:text-white',
                  )}
                >
                  Acceder
                </Link>
                <Link to="/reservar" className="btn-gold rounded-lg px-5 py-2.5 text-sm shadow-md">
                  Reservar
                </Link>
              </>
            )}
          </div>

          {/* Hamburger mobile */}
          <button
            className={clsx(
              'rounded-lg p-2 transition-colors md:hidden',
              navbarSolid ? 'text-slate-600 hover:bg-slate-100' : 'text-white hover:bg-white/10',
            )}
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Menú de navegación"
          >
            {menuAbierto ? <IconX /> : <IconMenu />}
          </button>
        </div>

        {/* Mobile menu slide */}
        <div className={clsx(
          'overflow-hidden transition-all duration-300 md:hidden',
          menuAbierto ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}>
          <div className="border-t border-slate-100 bg-white px-4 pb-5 pt-3">
            <nav className="space-y-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.exact}
                  onClick={cerrarMenu}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all',
                      isActive ? 'bg-[#0c1d3d]/5 text-[#0c1d3d] font-semibold' : 'text-slate-600 hover:bg-slate-50',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              {usuario ? (
                <>
                  <Link to="/mi-cuenta" onClick={cerrarMenu} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-slate-700">
                    <IconUser size={16} />{usuario.nombre}
                  </Link>
                  <button onClick={handleLogout} className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link to="/acceso" onClick={cerrarMenu} className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Iniciar Sesión
                  </Link>
                  <Link to="/reservar" onClick={cerrarMenu} className="btn-gold block rounded-lg px-4 py-3 text-center text-sm shadow-md">
                    Reservar Ahora
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ══════ Contenido ══════ */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ══════ Cookie Consent Banner ══════ */}
      <CookieConsent />

      {/* ══════ Footer Premium ══════ */}
      <footer className="relative overflow-hidden bg-[#0c1d3d] text-slate-400">
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="h-full w-full" viewBox="0 0 1200 400">
            <defs><pattern id="fdots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="1" fill="white" /></pattern></defs>
            <rect fill="url(#fdots)" width="100%" height="100%" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 lg:px-8">
          {/* CTA bar */}
          <div className="mb-14 flex flex-col items-center justify-between gap-6 rounded-2xl border border-[#c5a255]/20 bg-gradient-to-r from-[#c5a255]/10 to-[#e8d5a3]/10 px-8 py-8 sm:flex-row sm:px-12">
            <div>
              <h3 className="text-xl font-bold text-white sm:text-2xl">¿Listo para una experiencia única?</h3>
              <p className="mt-1 text-sm text-slate-400">Reserve ahora y disfrute de tarifas preferenciales.</p>
            </div>
            <Link to="/reservar" className="btn-gold shrink-0 rounded-lg px-8 py-3.5 text-sm shadow-lg">
              Reservar Ahora
            </Link>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Col 1: Marca */}
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#c5a255] to-[#e8d5a3]">
                  <span className="text-lg font-black text-[#0c1d3d]">H</span>
                </div>
                <div>
                  <span className="text-lg font-extrabold text-white">HotelFlux</span>
                  <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#c5a255]">Luxury</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                Donde la elegancia se encuentra con la tecnología. Un refugio de lujo en el corazón de Lima.
              </p>
              <div className="mt-5 flex gap-3">
                {['instagram', 'facebook', 'twitter'].map(s => (
                  <a key={s} href="#" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-500 transition-all hover:border-[#c5a255]/40 hover:text-[#c5a255]">
                    <span className="text-xs font-bold uppercase">{s[0]}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Col 2: Explorar */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a255]">Explorar</h3>
              <ul className="space-y-2.5 text-sm">
                {[{ to: '/', label: 'Inicio' }, { to: '/habitaciones', label: 'Habitaciones & Suites' }, { to: '/servicios', label: 'Servicios & Amenidades' }, { to: '/reservar', label: 'Reservar Ahora' }].map(l => (
                  <li key={l.to}><Link to={l.to} className="transition-colors hover:text-white">{l.label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Col 3: Legal */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a255]">Legal</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/legal/privacidad" className="transition-colors hover:text-white">Política de Privacidad</Link></li>
                <li><Link to="/legal/terminos" className="transition-colors hover:text-white">Términos y Condiciones</Link></li>
                <li><Link to="/legal/cookies" className="transition-colors hover:text-white">Política de Cookies</Link></li>
                <li><a href="#" className="transition-colors hover:text-white">Libro de Reclamaciones</a></li>
              </ul>
            </div>

            {/* Col 4: Contacto */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a255]">Contacto</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5"><IconMapPin size={16} /><span>Av. La Paz 456, Miraflores<br />Lima 15074, Perú</span></li>
                <li className="flex items-center gap-2.5"><IconPhone size={16} /> +51 (1) 555-0100</li>
                <li className="flex items-center gap-2.5"><IconMail size={16} /> reservas@hotelflux.pe</li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-7 sm:flex-row">
            <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} HotelFlux S.A.C. Todos los derechos reservados.</p>
            <p className="text-xs text-slate-600">Ley N° 29733 — Protección de Datos Personales &nbsp;|&nbsp; RUC: 20612345678</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
