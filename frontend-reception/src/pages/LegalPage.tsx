// ═══════════════════════════════════════════════════════════
// HotelFlux — Página Legal (Privacidad, Términos, Cookies)
// Cumplimiento: Ley N° 29733 (Perú)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  obtenerPoliticaPrivacidad,
  obtenerTerminos,
  obtenerPoliticaCookies,
  type DocumentoLegal,
} from '../services/publico.api';

type TipoLegal = 'privacidad' | 'terminos' | 'cookies';

const TITULOS: Record<TipoLegal, string> = {
  privacidad: 'Política de Privacidad',
  terminos: 'Términos y Condiciones',
  cookies: 'Política de Cookies',
};

// Datos estáticos de fallback en caso de error de API
const FALLBACK_PRIVACIDAD: DocumentoLegal = {
  titulo: 'Política de Privacidad',
  version: '1.0',
  fecha_actualizacion: '2025-01-01',
  ley_aplicable: 'Ley N° 29733',
  secciones: [
    {
      titulo: '1. Responsable del Tratamiento',
      contenido: 'HotelFlux S.A.C., con domicilio en Lima, Perú, es responsable del tratamiento de sus datos personales conforme a la Ley N° 29733 y su reglamento.',
    },
    {
      titulo: '2. Datos que Recopilamos',
      contenido: 'Recopilamos: nombre completo, documento de identidad (DNI/Pasaporte/CE), correo electrónico, teléfono, nacionalidad, datos de reserva y preferencias de estadía.',
    },
    {
      titulo: '3. Finalidad del Tratamiento',
      contenido: 'Sus datos son tratados para: (a) gestionar su reserva y estadía, (b) cumplir obligaciones legales, (c) enviar comunicaciones sobre su reserva, (d) mejorar nuestros servicios.',
    },
    {
      titulo: '4. Derechos ARCO',
      contenido: 'Usted tiene derecho de Acceso, Rectificación, Cancelación y Oposición (ARCO) sobre sus datos. Puede ejercerlos enviando solicitud a privacidad@hotelflux.pe.',
    },
    {
      titulo: '5. Medidas de Seguridad',
      contenido: 'Implementamos cifrado TLS 1.3, control de acceso basado en roles, auditoría de accesos y backups cifrados.',
    },
  ],
};

const FALLBACK_TERMINOS: DocumentoLegal = {
  titulo: 'Términos y Condiciones',
  version: '1.0',
  fecha_actualizacion: '2025-01-01',
  secciones: [
    {
      titulo: '1. Reservas',
      contenido: 'La reserva se confirma al completar el proceso en línea. Las tarifas incluyen IGV (18%).',
    },
    {
      titulo: '2. Check-in / Check-out',
      contenido: 'Check-in: a partir de las 14:00 horas. Check-out: hasta las 12:00 horas. Se requiere documento de identidad vigente.',
    },
    {
      titulo: '3. Cancelaciones',
      contenido: 'Cancelación gratuita hasta 48 horas antes del check-in. Cancelaciones tardías: cargo del 50% de la primera noche.',
    },
    {
      titulo: '4. Libro de Reclamaciones',
      contenido: 'Conforme al Código de Protección al Consumidor (Ley N° 29571), ponemos a disposición el Libro de Reclamaciones.',
    },
  ],
};

const FALLBACK_COOKIES: DocumentoLegal = {
  titulo: 'Política de Cookies',
  version: '1.0',
  fecha_actualizacion: '2025-01-01',
  secciones: [
    {
      titulo: '1. ¿Qué son las cookies?',
      contenido: 'Las cookies son pequeños archivos de texto almacenados en su dispositivo cuando visita nuestro sitio.',
    },
    {
      titulo: '2. Cookies que utilizamos',
      contenido: 'Cookies de sesión, token de autenticación, preferencias de idioma. No usamos cookies de publicidad.',
    },
    {
      titulo: '3. Gestión',
      contenido: 'Puede configurar su navegador para rechazar cookies no esenciales.',
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

export default function LegalPage() {
  const { tipo } = useParams<{ tipo: string }>();
  const tipoLegal = (['privacidad', 'terminos', 'cookies'].includes(tipo ?? '') ? tipo : 'privacidad') as TipoLegal;

  const [documento, setDocumento] = useState<DocumentoLegal | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/reservar" className="flex items-center gap-2 text-blue-700 font-bold text-xl">
            <span className="text-2xl">🏨</span> HotelFlux
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/legal/privacidad" className={`hover:text-blue-700 ${tipoLegal === 'privacidad' ? 'text-blue-700 font-semibold' : 'text-gray-600'}`}>
              Privacidad
            </Link>
            <Link to="/legal/terminos" className={`hover:text-blue-700 ${tipoLegal === 'terminos' ? 'text-blue-700 font-semibold' : 'text-gray-600'}`}>
              Términos
            </Link>
            <Link to="/legal/cookies" className={`hover:text-blue-700 ${tipoLegal === 'cookies' ? 'text-blue-700 font-semibold' : 'text-gray-600'}`}>
              Cookies
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {cargando ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700" />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{doc.titulo}</h1>
              <p className="text-sm text-gray-500 mb-1">
                Versión {doc.version} — Última actualización: {doc.fecha_actualizacion}
              </p>
              {doc.ley_aplicable && (
                <p className="text-sm text-blue-700 mb-6">
                  Marco legal: {doc.ley_aplicable}
                  {doc.reglamento && ` | ${doc.reglamento}`}
                </p>
              )}

              <div className="space-y-6 mt-8">
                {doc.secciones.map((seccion, i) => (
                  <section key={i} className="border-l-4 border-blue-200 pl-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">{seccion.titulo}</h2>
                    <p className="text-gray-600 leading-relaxed">{seccion.contenido}</p>
                  </section>
                ))}
              </div>
            </div>

            {/* Navigation between legal docs */}
            <div className="mt-8 flex justify-center gap-4">
              {(['privacidad', 'terminos', 'cookies'] as TipoLegal[])
                .filter(t => t !== tipoLegal)
                .map(t => (
                  <Link
                    key={t}
                    to={`/legal/${t}`}
                    className="px-4 py-2 bg-white rounded-lg border hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                  >
                    {TITULOS[t]}
                  </Link>
                ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm">
          <p>© {new Date().getFullYear()} HotelFlux S.A.C. — Lima, Perú</p>
          <p className="mt-1">
            Conforme a la Ley N° 29733 de Protección de Datos Personales
          </p>
          <div className="flex justify-center gap-4 mt-3">
            <Link to="/legal/privacidad" className="hover:text-white">Privacidad</Link>
            <Link to="/legal/terminos" className="hover:text-white">Términos</Link>
            <Link to="/legal/cookies" className="hover:text-white">Cookies</Link>
            <Link to="/reservar" className="hover:text-white">Reservar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
