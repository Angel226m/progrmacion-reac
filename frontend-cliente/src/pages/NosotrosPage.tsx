import { useI18n } from '../hooks/useI18n';

const STATS = [
  { value: '10+', label: 'nosotros.stat_anos' },
  { value: '500+', label: 'nosotros.stat_clientes' },
  { value: '4.9', label: 'nosotros.stat_valoracion' },
  { value: '50+', label: 'nosotros.stat_servicios' },
];

export default function NosotrosPage() {
  const { t } = useI18n();

  return (
    <div>
      {/* Hero */}
      <section className="relative flex items-center justify-center overflow-hidden bg-[#0c1d3d] px-6 py-28 sm:py-36">
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="h-full w-full" viewBox="0 0 1200 400">
            <defs><pattern id="ndots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="1" fill="white" /></pattern></defs>
            <rect fill="url(#ndots)" width="100%" height="100%" />
          </svg>
        </div>
        <div className="relative text-center">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.3em] text-[#c5a255]">{t('nav.nosotros')}</span>
          <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">{t('nosotros.title')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">{t('nosotros.subtitle')}</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 mx-auto -mt-10 max-w-5xl px-6 sm:px-8">
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:grid-cols-4 sm:p-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <span className="block text-2xl font-black text-[#c5a255] sm:text-3xl">{s.value}</span>
              <span className="mt-1 block text-xs font-medium text-slate-500 sm:text-sm">{t(s.label)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#c5a255]/20 to-[#e8d5a3]/5 ring-1 ring-[#c5a255]/20" />
            <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-2xl border-2 border-[#c5a255]/30 bg-[#0c1d3d] p-4 shadow-xl">
              <span className="block text-3xl font-black text-[#c5a255]">5</span>
              <span className="text-xs font-medium text-slate-400">{t('nosotros.estrellas')}</span>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#0c1d3d] sm:text-4xl">{t('nosotros.story_title')}</h2>
            <div className="mt-2 h-1 w-16 rounded-full bg-[#c5a255]" />
            <p className="mt-6 text-base leading-relaxed text-slate-600">{t('nosotros.story_p1')}</p>
            <p className="mt-4 text-base leading-relaxed text-slate-600">{t('nosotros.story_p2')}</p>
          </div>
        </div>
      </section>

      {/* Mision Vision Valores */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0c1d3d]">
                <svg className="h-6 w-6 text-[#c5a255]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#0c1d3d]">{t('nosotros.mision')}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('nosotros.mision_desc')}</p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0c1d3d]">
                <svg className="h-6 w-6 text-[#c5a255]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#0c1d3d]">{t('nosotros.vision')}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('nosotros.vision_desc')}</p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0c1d3d]">
                <svg className="h-6 w-6 text-[#c5a255]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#0c1d3d]">{t('nosotros.valores')}</h3>
              <ul className="mt-4 space-y-2.5">
                {['nosotros.valor_1', 'nosotros.valor_2', 'nosotros.valor_3', 'nosotros.valor_4', 'nosotros.valor_5'].map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#c5a255]" />
                    <span className="text-sm font-semibold text-slate-800">{t(k)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center sm:px-8">
        <h2 className="text-2xl font-bold text-[#0c1d3d] sm:text-3xl">{t('footer.cta_title')}</h2>
        <p className="mt-2 text-slate-500">{t('footer.cta_desc')}</p>
        <a href="/reservar" className="btn-gold mt-6 inline-block rounded-lg px-8 py-3.5 text-sm shadow-lg">
          {t('footer.cta_btn')}
        </a>
      </section>
    </div>
  );
}
