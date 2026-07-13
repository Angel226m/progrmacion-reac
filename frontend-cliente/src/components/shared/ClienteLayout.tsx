// ═══════════════════════════════════════════════════════════
// HotelFlux — Layout Público Premium para Clientes
// Navbar con efecto scroll + Footer luxury
// Diseño: Four Seasons / Aman inspired
// Responsive: PC, tablet, laptop, celular
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../hooks/useI18n';
import type { Locale } from '../../i18n';
import CookieConsent from './CookieConsent';
import clsx from 'clsx';

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

const IDIOMAS: Record<Locale, { label: string }> = {
  es: { label: 'ES' },
  en: { label: 'EN' },
};

export default function ClienteLayout() {
  const { usuario, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = location.pathname === '/';

  const NAV_LINKS = [
    { path: '/', label: t('nav.inicio'), exact: true },
    { path: '/nosotros', label: t('nav.nosotros'), exact: false },
    { path: '/habitaciones', label: t('nav.habitaciones'), exact: false },
    { path: '/contacto', label: t('nav.contacto'), exact: false },
  ] as const;

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
          <span className="tracking-wide">{t('topbar.checkin')}</span>
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

          {/* Language Switcher + Auth area desktop */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Language Switcher */}
            <div className="mr-1 flex items-center gap-1 rounded-lg border border-transparent px-2 py-1">
              {(Object.keys(IDIOMAS) as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={clsx(
                    'rounded-md px-2 py-1 text-xs font-semibold uppercase transition-all',
                    locale === l
                      ? navbarSolid ? 'bg-[#c5a255] text-white' : 'bg-white/20 text-white'
                      : navbarSolid ? 'text-slate-400 hover:text-slate-700' : 'text-white/50 hover:text-white/80',
                  )}
                >
                  {IDIOMAS[l].label}
                </button>
              ))}
            </div>

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
                    {t('nav.panel')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className={clsx(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    navbarSolid ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-white/50 hover:text-white',
                  )}
                >
                  {t('nav.salir')}
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
                  {t('nav.acceder')}
                </Link>
                <Link to="/reservar" className="btn-gold rounded-lg px-5 py-2.5 text-sm shadow-md">
                  {t('nav.reservar')}
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
          menuAbierto ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
        )}>
          <div className="border-t border-slate-100 bg-white px-4 pb-5 pt-3">
            {/* Lang switcher mobile */}
            <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
              {(Object.keys(IDIOMAS) as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={clsx(
                    'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition-all',
                    locale === l ? 'bg-white text-[#0c1d3d] shadow-sm' : 'text-slate-500',
                  )}
                >
                  {IDIOMAS[l].label}
                </button>
              ))}
            </div>

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
                    {t('nav.salir')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/acceso" onClick={cerrarMenu} className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    {t('nav.acceder')}
                  </Link>
                  <Link to="/reservar" onClick={cerrarMenu} className="btn-gold block rounded-lg px-4 py-3 text-center text-sm shadow-md">
                    {t('nav.reservar')}
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

      {/* ══════ Floating Social Buttons ══════ */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <a href="https://wa.me/5115550100" target="_blank" rel="noopener noreferrer"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
          aria-label="WhatsApp">
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
        <a href="https://instagram.com/hotelflux" target="_blank" rel="noopener noreferrer"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
          aria-label="Instagram">
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
        </a>
        <a href="https://tiktok.com/@hotelflux" target="_blank" rel="noopener noreferrer"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
          aria-label="TikTok">
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
        </a>
      </div>

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
              <h3 className="text-xl font-bold text-white sm:text-2xl">{t('footer.cta_title')}</h3>
              <p className="mt-1 text-sm text-slate-400">{t('footer.cta_desc')}</p>
            </div>
            <Link to="/reservar" className="btn-gold shrink-0 rounded-lg px-8 py-3.5 text-sm shadow-lg">
              {t('footer.cta_btn')}
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
              <p className="text-sm leading-relaxed">{t('footer.desc')}</p>
              <div className="mt-5 flex gap-3">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-500 transition-all hover:border-[#c5a255]/40 hover:text-[#c5a255]">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </a>
                <a href="https://wa.me/5115550100" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-500 transition-all hover:border-[#c5a255]/40 hover:text-[#c5a255]">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-500 transition-all hover:border-[#c5a255]/40 hover:text-[#c5a255]">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                </a>
              </div>
            </div>

            {/* Col 2: Explorar */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a255]">{t('footer.explorar')}</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/" className="transition-colors hover:text-white">{t('nav.inicio')}</Link></li>
                <li><Link to="/nosotros" className="transition-colors hover:text-white">{t('nav.nosotros')}</Link></li>
                <li><Link to="/habitaciones" className="transition-colors hover:text-white">{t('footer.habitaciones')}</Link></li>
                <li><Link to="/contacto" className="transition-colors hover:text-white">{t('nav.contacto')}</Link></li>
                <li><Link to="/reservar" className="transition-colors hover:text-white">{t('footer.cta_btn')}</Link></li>
              </ul>
            </div>

            {/* Col 3: Legal */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a255]">{t('footer.legal')}</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/legal/privacidad" className="transition-colors hover:text-white">{t('footer.privacidad')}</Link></li>
                <li><Link to="/legal/terminos" className="transition-colors hover:text-white">{t('footer.terminos')}</Link></li>
                <li><Link to="/legal/cookies" className="transition-colors hover:text-white">{t('footer.cookies')}</Link></li>
                <li><a href="#" className="transition-colors hover:text-white">{t('footer.libro')}</a></li>
              </ul>
            </div>

            {/* Col 4: Contacto */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a255]">{t('footer.contacto')}</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5"><IconMapPin size={16} /><span>{t('contacto.ciudad')}<br />{t('contacto.direccion').replace(/<br\s*\/?>/g, ', ')}</span></li>
                <li className="flex items-center gap-2.5"><IconPhone size={16} /> {t('contacto.telefono')}</li>
                <li className="flex items-center gap-2.5"><IconMail size={16} /> {t('contacto.email')}</li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-7 sm:flex-row">
            <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} HotelFlux S.A.C. {t('footer.copyright')}</p>
            <p className="text-xs text-slate-600">{t('footer.datos')} &nbsp;|&nbsp; RUC: 20612345678</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
