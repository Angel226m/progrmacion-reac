import { useState, type FormEvent } from 'react';
import { useI18n } from '../hooks/useI18n';

const ESTILO_INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#c5a255] focus:ring-2 focus:ring-[#c5a255]/20';

function IconMapPin({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconPhone({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconMail({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconClock({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  );
}

export default function ContactoPage() {
  const { t } = useI18n();
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative flex items-center justify-center overflow-hidden bg-[#0c1d3d] px-6 py-28 sm:py-36">
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="h-full w-full" viewBox="0 0 1200 400">
            <defs><pattern id="cdot" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="1" fill="white" /></pattern></defs>
            <rect fill="url(#cdot)" width="100%" height="100%" />
          </svg>
        </div>
        <div className="relative text-center">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.3em] text-[#c5a255]">{t('nav.contacto')}</span>
          <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">{t('contacto.title')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">{t('contacto.subtitle')}</p>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Info Column */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-[#0c1d3d]">{t('contacto.info_title')}</h2>
            <div className="mt-2 h-1 w-16 rounded-full bg-[#c5a255]" />

            <div className="mt-8 space-y-6">
              {/* Address */}
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0c1d3d]">
                  <IconMapPin size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{t('contacto.direccion_label')}</h3>
                  <p className="mt-0.5 text-sm text-slate-500" dangerouslySetInnerHTML={{ __html: t('contacto.direccion') }} />
                  <p className="text-sm text-slate-500">{t('contacto.ciudad')}</p>
                </div>
              </div>

              {/* Map Embed */}
              <div className="overflow-hidden rounded-xl shadow-sm ring-1 ring-slate-200">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.2962372829974!2d-71.9811924!3d-13.5168048!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x916dd5d826598431%3A0x2aa3c7e2e0c2e7b5!2sPlaza%20de%20Armas%20del%20Cusco!5e0!3m2!1ses-419!2spe!4v1"
                  width="100%"
                  height="220"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación HotelFlux Cusco"
                />
              </div>

              {/* Phone */}
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0c1d3d]">
                  <IconPhone size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{t('contacto.telefono_label')}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">{t('contacto.telefono')}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0c1d3d]">
                  <IconMail size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{t('contacto.email_label')}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">{t('contacto.email')}</p>
                </div>
              </div>

              {/* Horarios */}
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0c1d3d]">
                  <IconClock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{t('contacto.horarios_label')}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">{t('contacto.horarios')}</p>
                </div>
              </div>

              {/* Social */}
              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-800">{t('contacto.siguenos')}</h3>
                <div className="flex gap-3">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1877F2] text-white transition-transform hover:scale-105">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white transition-transform hover:scale-105">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-bold text-[#0c1d3d]">{t('contacto.form_title')}</h2>
              <div className="mt-2 h-1 w-12 rounded-full bg-[#c5a255]" />

              {enviado ? (
                <div className="mt-8 rounded-xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200">
                  <svg className="mx-auto h-12 w-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-emerald-800">{t('contacto.success')}</p>
                  <button onClick={() => setEnviado(false)} className="mt-4 text-xs font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-800">
                    {t('contacto.form_enviar_otro')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t('contacto.form_nombre')}</label>
                      <input type="text" required className={ESTILO_INPUT} placeholder={t('contacto.form_placeholder_nombre')} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t('contacto.form_email')}</label>
                      <input type="email" required className={ESTILO_INPUT} placeholder={t('contacto.form_placeholder_email')} />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t('contacto.form_telefono')}</label>
                      <input type="tel" className={ESTILO_INPUT} placeholder={t('contacto.form_placeholder_telefono')} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t('contacto.form_sede')}</label>
                      <select className={ESTILO_INPUT}>
                        <option value="pisco">{t('contacto.form_sede_pisco')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t('contacto.form_asunto')}</label>
                    <input type="text" required className={ESTILO_INPUT} placeholder={t('contacto.form_placeholder_asunto')} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t('contacto.form_mensaje')}</label>
                    <textarea required rows={5} className={`${ESTILO_INPUT} resize-y min-h-[120px]`} placeholder={t('contacto.form_placeholder_mensaje')} />
                  </div>

                  <button type="submit" className="btn-gold w-full rounded-xl px-6 py-3.5 text-sm font-bold shadow-md transition-all hover:shadow-lg">
                    {t('contacto.form_enviar')}
                    <svg className="ml-2 inline-block h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
