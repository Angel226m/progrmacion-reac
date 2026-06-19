// ═══════════════════════════════════════════════════════════
// HotelFlux — Página Legal Premium (Privacidad, Términos, Cookies)
// Cumplimiento: Ley N° 29733 (Perú) + GDPR references
// Diseño: Premium luxury, tabla de contenidos, accordion sections
// OWASP A05: CSP, A07: política contraseñas documentada
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';
import {
  obtenerPoliticaPrivacidad,
  obtenerTerminos,
  obtenerPoliticaCookies,
  type DocumentoLegal,
} from '../services/publico.api';

type TipoLegal = 'privacidad' | 'terminos' | 'cookies';

const TAB_CONFIG: { tipo: TipoLegal; icon: string; color: string }[] = [
  { tipo: 'privacidad', icon: '🔒', color: 'from-blue-600 to-blue-700' },
  { tipo: 'terminos', icon: '📋', color: 'from-emerald-600 to-emerald-700' },
  { tipo: 'cookies', icon: '🍪', color: 'from-amber-600 to-amber-700' },
];

// ── Datos completos de fallback — Ley N° 29733 (Perú) ──

const FALLBACK_PRIVACIDAD: DocumentoLegal = {
  titulo: 'Política de Privacidad',
  version: '2.1',
  fecha_actualizacion: '2026-01-15',
  ley_aplicable: 'Ley N° 29733 — Ley de Protección de Datos Personales',
  reglamento: 'D.S. N° 003-2013-JUS',
  secciones: [
    {
      titulo: '1. Responsable del Tratamiento de Datos',
      contenido: 'HotelFlux S.A.C., con RUC 20612345678 y domicilio en Av. La Paz 456, Miraflores, Lima 15074, Perú, es el responsable del tratamiento de sus datos personales conforme a la Ley N° 29733 — Ley de Protección de Datos Personales y su Reglamento aprobado por D.S. N° 003-2013-JUS. Nuestro Oficial de Protección de Datos puede ser contactado en privacidad@hotelflux.pe.',
    },
    {
      titulo: '2. Datos Personales que Recopilamos',
      contenido: 'Recopilamos las siguientes categorías de datos personales:\n\n• Datos de identificación: nombre completo, documento de identidad (DNI/CE/Pasaporte), fotografía del documento.\n• Datos de contacto: correo electrónico, número telefónico, dirección postal.\n• Datos de la reserva: fechas de estadía, tipo de habitación, preferencias, requerimientos especiales.\n• Datos de pago: método de pago (no almacenamos datos completos de tarjeta — procesamiento PCI DSS).\n• Datos de navegación: dirección IP, tipo de dispositivo/navegador, cookies (ver Política de Cookies).\n• Datos de acceso al sistema: credenciales de empleados (hash Bcrypt, nunca en texto plano).',
    },
    {
      titulo: '3. Finalidad del Tratamiento',
      contenido: 'Sus datos personales son tratados exclusivamente para las siguientes finalidades:\n\na) Gestionar su reserva, check-in, estadía y check-out.\nb) Cumplir obligaciones legales y tributarias (SUNAT, Dirección Regional de Turismo).\nc) Enviar comunicaciones relativas a su reserva (confirmaciones, recordatorios).\nd) Mejorar nuestros servicios mediante análisis estadísticos anonimizados.\ne) Garantizar la seguridad de nuestros huéspedes y colaboradores.\nf) Gestionar el Libro de Reclamaciones conforme al Código de Protección al Consumidor.\n\nNo realizamos perfilado automatizado ni transferencia internacional de datos sin su consentimiento.',
    },
    {
      titulo: '4. Base Legal del Tratamiento',
      contenido: 'El tratamiento de sus datos se fundamenta en:\n\n• Consentimiento expreso (Art. 13.5 de la Ley N° 29733).\n• Ejecución de relación contractual (reserva hotelera).\n• Cumplimiento de obligaciones legales (obligaciones tributarias, registro migratorio).\n• Interés legítimo del responsable (seguridad, prevención de fraude).',
    },
    {
      titulo: '5. Derechos ARCO del Titular',
      contenido: 'Conforme a la Ley N° 29733, usted tiene los siguientes derechos sobre sus datos personales:\n\n• Acceso (Art. 19): Conocer qué datos tenemos sobre usted.\n• Rectificación (Art. 20): Corregir datos inexactos o incompletos.\n• Cancelación (Art. 21): Solicitar la eliminación de sus datos cuando no sean necesarios.\n• Oposición (Art. 22): Oponerse al tratamiento de sus datos en determinadas circunstancias.\n\nPara ejercer estos derechos, envíe una solicitud a privacidad@hotelflux.pe adjuntando copia de su documento de identidad. Plazo de respuesta: 10 días hábiles. Autoridad de control: Autoridad Nacional de Protección de Datos Personales (ANPDP).',
    },
    {
      titulo: '6. Medidas de Seguridad Técnicas y Organizativas',
      contenido: 'Implementamos las siguientes medidas conforme al Art. 16 de la Ley N° 29733 y estándares internacionales:\n\n• Cifrado TLS 1.3 en todas las comunicaciones.\n• Hash de contraseñas con Bcrypt (12 rounds) — OWASP A02.\n• Control de acceso basado en roles (RBAC) con JWT HTTP-only — OWASP A01.\n• Rate limiting (Redis sliding window) contra ataques de fuerza bruta — OWASP A04.\n• Sanitización de inputs contra inyección SQL y XSS — OWASP A03.\n• Auditoría de accesos conforme a ISO 27001 A.12.4.\n• Backups cifrados AES-256 con retención de 30 días.\n• Contenedores Docker hardened con imágenes Alpine minimal.',
    },
    {
      titulo: '7. Conservación de Datos',
      contenido: 'Los datos personales se conservan durante el período necesario para cumplir las finalidades descritas:\n\n• Datos de reserva: 5 años (obligación tributaria SUNAT).\n• Datos de contacto: hasta que ejerza su derecho de cancelación.\n• Logs de auditoría: 1 año (ISO 27001 A.12.4).\n• Datos de empleados: durante la relación laboral + 5 años.\n\nTranscurridos estos plazos, los datos son eliminados de forma segura mediante soft delete y posterior purga.',
    },
    {
      titulo: '8. Transferencia de Datos',
      contenido: 'No transferimos sus datos personales a terceros sin su consentimiento, salvo:\n\n• Requerimiento judicial o de autoridad competente.\n• Necesidad para la ejecución del contrato (pasarela de pagos certificada PCI DSS).\n• Dirección Regional de Turismo (registro obligatorio de huéspedes).\n\nNo realizamos transferencias internacionales de datos.',
    },
    {
      titulo: '9. Modificaciones a esta Política',
      contenido: 'Nos reservamos el derecho de actualizar esta política. Los cambios serán notificados mediante aviso en nuestra web y correo electrónico. La fecha de última actualización se indica al inicio del documento.',
    },
  ],
};

const FALLBACK_TERMINOS: DocumentoLegal = {
  titulo: 'Términos y Condiciones',
  version: '2.1',
  fecha_actualizacion: '2026-01-15',
  ley_aplicable: 'Ley N° 29571 — Código de Protección y Defensa del Consumidor',
  secciones: [
    {
      titulo: '1. Objeto y Aceptación',
      contenido: 'Los presentes Términos y Condiciones regulan el uso del sistema de reservas en línea de HotelFlux S.A.C. (en adelante "el Hotel"). Al utilizar nuestro sitio web y/o realizar una reserva, usted acepta estos términos en su totalidad. El uso del sistema implica la aceptación de la Política de Privacidad y la Política de Cookies.',
    },
    {
      titulo: '2. Reservas y Confirmación',
      contenido: 'La reserva se confirma al completar el proceso en línea y recibir un código de confirmación único (formato HF-XXXXXXXX). Las tarifas mostradas incluyen IGV (18%) conforme a la legislación tributaria peruana. Las tarifas son por habitación por noche y están sujetas a disponibilidad. El Hotel se reserva el derecho de cancelar reservas en caso de error manifiesto en el precio publicado.',
    },
    {
      titulo: '3. Check-in y Check-out',
      contenido: '• Check-in: a partir de las 14:00 horas. Early check-in sujeto a disponibilidad (cargo adicional de 50%).\n• Check-out: hasta las 12:00 horas. Late check-out sujeto a disponibilidad (cargo adicional de 50% hasta las 18:00h, 100% después).\n• Se requiere documento de identidad vigente (DNI, CE o Pasaporte) al momento del check-in.\n• Para huéspedes extranjeros, se requiere pasaporte vigente y tarjeta migratoria (obligación D.S. N° 023-2001-ITINCI).',
    },
    {
      titulo: '4. Política de Cancelación',
      contenido: '• Cancelación gratuita: hasta 48 horas antes de la fecha de check-in.\n• Cancelación tardía (24-48h antes): cargo del 50% de la primera noche.\n• No-show o cancelación el mismo día: cargo del 100% de la primera noche.\n• Reservas no reembolsables: se indica claramente al momento de la reserva.\n• Las modificaciones de fecha están sujetas a disponibilidad sin cargo adicional si se solicitan con 48h de anticipación.\n• Para solicitar cancelación, escriba a reservas@hotelflux.pe o llame al +51 (1) 555-0100.',
    },
    {
      titulo: '5. Formas de Pago',
      contenido: 'Aceptamos los siguientes métodos de pago:\n\n• Tarjetas de crédito/débito Visa, Mastercard, American Express.\n• Transferencia bancaria (BCP, BBVA, Interbank, Scotiabank).\n• Pago en efectivo al momento del check-in (solo en Soles).\n\nTodos los pagos se procesan en Soles Peruanos (S/) e incluyen IGV 18%. Los cargos a tarjeta aparecerán como "HOTELFLUX SAC" en su estado de cuenta.',
    },
    {
      titulo: '6. Responsabilidades del Huésped',
      contenido: '• Mantener orden y cuidado de las instalaciones y mobiliario.\n• Respetar los horarios de silencio (22:00 — 07:00).\n• No fumar dentro de las habitaciones (multa de S/ 500).\n• No está permitido el ingreso de mascotas (excepto perros de servicio certificados).\n• Cualquier daño a las instalaciones será cobrado al huésped según valorización.\n• El Hotel no se responsabiliza por objetos de valor no depositados en la caja fuerte.',
    },
    {
      titulo: '7. Libro de Reclamaciones',
      contenido: 'Conforme al Código de Protección al Consumidor (Ley N° 29571) y su Reglamento (D.S. N° 011-2011-PCM), HotelFlux pone a disposición de sus clientes el Libro de Reclamaciones en formato físico en recepción y en formato virtual en nuestro sitio web. La hoja de reclamación será atendida en un plazo máximo de 30 días calendario. Puede presentar su reclamo dirigiéndose a recepción o escribiendo a reclamos@hotelflux.pe.\n\nEntidad supervisora: INDECOPI (Instituto Nacional de Defensa de la Competencia y de la Protección de la Propiedad Intelectual).',
    },
    {
      titulo: '8. Propiedad Intelectual',
      contenido: 'Todo el contenido del sitio web (textos, imágenes, logotipos, diseño, código fuente) es propiedad de HotelFlux S.A.C. y está protegido por las leyes de propiedad intelectual del Perú y tratados internacionales. Queda prohibida su reproducción sin autorización expresa.',
    },
    {
      titulo: '9. Limitación de Responsabilidad',
      contenido: 'HotelFlux no será responsable por:\n\n• Interrupciones del servicio web por mantenimiento programado o causas de fuerza mayor.\n• Pérdidas indirectas derivadas del uso del sistema de reservas.\n• Errores en la información proporcionada por el usuario.\n• Contenido de sitios web de terceros enlazados desde nuestro sitio.',
    },
    {
      titulo: '10. Legislación Aplicable y Jurisdicción',
      contenido: 'Estos términos se rigen por la legislación peruana. Cualquier controversia será resuelta en primera instancia mediante negociación directa. En caso de no llegar a acuerdo, las partes se someten a la jurisdicción de los juzgados y tribunales del distrito judicial de Lima.\n\nNormativa aplicable: Ley N° 29571 (Código de Protección al Consumidor), Ley N° 29733 (Protección de Datos Personales), D.S. N° 023-2001-ITINCI (Reglamento de Establecimientos de Hospedaje).',
    },
  ],
};

const FALLBACK_COOKIES: DocumentoLegal = {
  titulo: 'Política de Cookies',
  version: '2.1',
  fecha_actualizacion: '2026-01-15',
  ley_aplicable: 'Ley N° 29733 — Ley de Protección de Datos Personales',
  secciones: [
    {
      titulo: '1. ¿Qué son las Cookies?',
      contenido: 'Las cookies son pequeños archivos de texto que se almacenan en su dispositivo (ordenador, tablet o teléfono móvil) cuando visita nuestro sitio web. Permiten que el sitio recuerde sus acciones y preferencias durante un período de tiempo, de modo que no tenga que volver a introducirlas cada vez que regrese al sitio o navegue de una página a otra.',
    },
    {
      titulo: '2. Tipos de Cookies que Utilizamos',
      contenido: '🔹 Cookies Esenciales (Obligatorias)\nNecesarias para el funcionamiento del sitio. No pueden desactivarse.\n• session_token — Autenticación de usuario (JWT HTTP-only, Secure, SameSite=Strict). Duración: 12h o 7 días (Remember Me).\n• csrf_token — Protección contra ataques CSRF. Duración: sesión.\n\n🔹 Cookies Funcionales\nPermiten recordar sus preferencias y mejorar la experiencia.\n• language — Idioma preferido. Duración: 1 año.\n• theme — Preferencia visual (claro/oscuro). Duración: 1 año.\n• cookie_consent — Registro de su consentimiento de cookies. Duración: 1 año.\n\n🔹 Cookies de Rendimiento/Analítica\nNos ayudan a entender cómo se utiliza el sitio (datos anonimizados).\n• analytics_session — Identificador de sesión analítica. Duración: 30 minutos.\n\n❌ Cookies de Publicidad\nNO utilizamos cookies de publicidad ni tracking de terceros.',
    },
    {
      titulo: '3. Cookies de Terceros',
      contenido: 'Nuestro sitio NO incorpora cookies de redes sociales, publicidad programática ni servicios de tracking de terceros. Las únicas cookies presentes son las estrictamente necesarias para el funcionamiento del sistema y las de rendimiento propias.\n\nNo compartimos información de cookies con terceros bajo ninguna circunstancia.',
    },
    {
      titulo: '4. Control y Gestión de Cookies',
      contenido: 'Usted tiene control total sobre las cookies instaladas en su dispositivo:\n\n• Banner de Consentimiento: Al visitar nuestro sitio por primera vez, se muestra un banner con opciones de aceptación.\n• Configuración del Navegador: Puede configurar su navegador para bloquear o eliminar cookies.\n  — Chrome: Configuración > Privacidad > Cookies\n  — Firefox: Opciones > Privacidad > Cookies\n  — Safari: Preferencias > Privacidad > Cookies\n  — Edge: Configuración > Cookies y permisos\n\n⚠️ Nota: Bloquear cookies esenciales puede afectar el funcionamiento del sitio (no podrá iniciar sesión ni hacer reservas).',
    },
    {
      titulo: '5. Seguridad de las Cookies',
      contenido: 'Todas nuestras cookies implementan las siguientes medidas de seguridad conforme a OWASP:\n\n• HttpOnly: Las cookies de sesión no son accesibles mediante JavaScript (prevención XSS — OWASP A03).\n• Secure: Solo se transmiten por HTTPS (prevención Man-in-the-Middle — OWASP A02).\n• SameSite=Strict: Prevención de ataques CSRF.\n• Duración limitada: Cookies de sesión (12h por defecto), cookies de preferencia (máximo 1 año).\n• No almacenamos información sensible en cookies (contraseñas, datos bancarios).',
    },
    {
      titulo: '6. Base Legal',
      contenido: 'El uso de cookies se fundamenta en:\n\n• Cookies esenciales: Interés legítimo (necesarias para el funcionamiento del servicio).\n• Cookies funcionales y analíticas: Consentimiento del usuario (Art. 13.5, Ley N° 29733).\n\nPuede retirar su consentimiento en cualquier momento desde la configuración de cookies.',
    },
    {
      titulo: '7. Actualizaciones',
      contenido: 'Esta política se revisa periódicamente. La fecha de última actualización se indica al inicio del documento. Los cambios significativos serán notificados mediante aviso en el sitio web.',
    },
  ],
};

const FALLBACKS: Record<TipoLegal, DocumentoLegal> = {
  privacidad: FALLBACK_PRIVACIDAD,
  terminos: FALLBACK_TERMINOS,
  cookies: FALLBACK_COOKIES,
};

const FETCHERS: Record<TipoLegal, () => Promise<DocumentoLegal>> = {
  privacidad: obtenerPoliticaPrivacidad,
  terminos: obtenerTerminos,
  cookies: obtenerPoliticaCookies,
};

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function LegalPage() {
  const { t } = useI18n();
  const { tipo } = useParams<{ tipo: string }>();
  const navigate = useNavigate();
  const tipoLegal = (['privacidad', 'terminos', 'cookies'].includes(tipo ?? '') ? tipo : 'privacidad') as TipoLegal;

  const [documento, setDocumento] = useState<DocumentoLegal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    setCargando(true);
    setExpandidas(new Set([0]));
    const fetcher = FETCHERS[tipoLegal];
    if (fetcher) {
      fetcher()
        .then(setDocumento)
        .catch(() => setDocumento(FALLBACKS[tipoLegal]))
        .finally(() => setCargando(false));
    } else {
      setDocumento(FALLBACKS[tipoLegal]);
      setCargando(false);
    }
  }, [tipoLegal]);

  const doc = documento ?? FALLBACKS[tipoLegal];
  const tabActual = TAB_CONFIG.find(t => t.tipo === tipoLegal)!;

  const toggleSeccion = useCallback((idx: number) => {
    setExpandidas(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const expandirTodo = useCallback(() => {
    setExpandidas(new Set(doc.secciones.map((_, i) => i)));
  }, [doc]);

  const contraerTodo = useCallback(() => {
    setExpandidas(new Set());
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-white">
      {/* ── Hero Header ── */}
      <section className="relative overflow-hidden bg-[#0c1d3d] py-16 sm:py-20">
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="h-full w-full" viewBox="0 0 1200 400">
            <defs><pattern id="legalgrid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="0.3" /></pattern></defs>
            <rect width="1200" height="400" fill="url(#legalgrid)" />
          </svg>
        </div>
        <div className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-[#c5a255]/5 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#c5a255]">
            {t('legal.hero_tag')}
          </p>
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {tabActual.icon} {doc.titulo}
          </h1>
          <p className="mx-auto max-w-xl text-base text-slate-400">
            {t('legal.hero_desc')}
          </p>

          {/* Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm">
              🇵🇪 Ley N° 29733
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm">
              🔒 OWASP Top 10
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm">
              📋 ISO 27001
            </span>
          </div>
        </div>
      </section>

      {/* ── Tabs de navegación ── */}
      <div className="sticky top-[64px] z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-1 px-4 py-2 sm:gap-2">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.tipo}
              onClick={() => navigate(`/legal/${tab.tipo}`)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all sm:px-5 ${
                tipoLegal === tab.tipo
                  ? 'bg-[#0c1d3d] text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="hidden sm:inline">{t('legal.' + tab.tipo)}</span>
              <span className="sm:hidden">{t('legal.' + tab.tipo).split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#c5a255]" />
            <p className="mt-4 text-sm text-slate-400">{t('legal.cargando')}</p>
          </div>
        ) : (
          <>
            {/* Document meta card */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 sm:text-3xl">{doc.titulo}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium">
                      {t('legal.version').replace('{v}', doc.version)}
                    </span>
                    <span>{t('legal.actualizado').replace('{fecha}', doc.fecha_actualizacion)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={expandirTodo} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    {t('legal.expandir')}
                  </button>
                  <button onClick={contraerTodo} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    {t('legal.contraer')}
                  </button>
                </div>
              </div>

              {doc.ley_aplicable && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm">
                  <span className="text-base">⚖️</span>
                  <div>
                    <span className="font-semibold text-blue-800">{t('legal.marco_legal')} </span>
                    <span className="text-blue-700">{doc.ley_aplicable}</span>
                    {doc.reglamento && <span className="text-blue-600"> — {doc.reglamento}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Table of contents */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
                {t('legal.indice')}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {doc.secciones.map((seccion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setExpandidas(prev => new Set(prev).add(i));
                      document.getElementById(`sec-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition-all hover:bg-slate-50 hover:text-[#0c1d3d]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c5a255]/10 text-[10px] font-bold text-[#c5a255]">
                      {i + 1}
                    </span>
                    <span className="line-clamp-1">{seccion.titulo.replace(/^\d+\.\s*/, '')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accordion sections */}
            <div className="space-y-3">
              {doc.secciones.map((seccion, i) => {
                const isOpen = expandidas.has(i);
                return (
                  <div
                    key={i}
                    id={`sec-${i}`}
                    className={`rounded-2xl border bg-white shadow-sm transition-all ${
                      isOpen ? 'border-[#c5a255]/30 shadow-md' : 'border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => toggleSeccion(i)}
                      className="flex w-full items-center justify-between p-5 text-left sm:p-6"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                          isOpen ? 'bg-[#c5a255] text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {i + 1}
                        </span>
                        <h3 className="text-base font-semibold text-slate-800 sm:text-lg">{seccion.titulo}</h3>
                      </div>
                      <IconChevron open={isOpen} />
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 pb-6 pt-4 sm:px-6 animate-fade-in">
                        <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-600 sm:text-base">
                          {seccion.contenido.split('\n\n').map((parrafo, j) => (
                            <p key={j} className="mb-3 last:mb-0 whitespace-pre-line">
                              {parrafo}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Contact card */}
            <div className="mt-10 rounded-2xl border border-[#c5a255]/20 bg-gradient-to-r from-[#c5a255]/5 to-[#e8d5a3]/5 p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t('legal.contacto_title')}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {t('legal.contacto_desc')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>📧 privacidad@hotelflux.pe</span>
                    <span>📞 +51 (1) 555-0100</span>
                  </div>
                </div>
                <Link
                  to="/reservar"
                  className="btn-gold shrink-0 rounded-xl px-6 py-3 text-center text-sm shadow-md"
                >
                  {t('legal.reservar_confianza')}
                </Link>
              </div>
            </div>

            {/* Navigation between docs */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {TAB_CONFIG.filter(cfg => cfg.tipo !== tipoLegal).map((cfg) => (
                <Link
                  key={cfg.tipo}
                  to={`/legal/${cfg.tipo}`}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-[#c5a255] hover:shadow-md"
                >
                  <span>{cfg.icon}</span>
                  {t('legal.' + cfg.tipo)}
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
