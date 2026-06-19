import es from './es.json';
import en from './en.json';

export type Locale = 'es' | 'en';

type Translations = Readonly<Record<string, string | readonly string[]>>;

const translations: Readonly<Record<Locale, Translations>> = { es, en };

const STORAGE_KEY = 'hotelflux_locale';

export const t = (key: string, locale: Locale): string =>
  (typeof translations[locale]?.[key] === 'string'
    ? translations[locale]![key]
    : key) as string;

export const tArray = (key: string, locale: Locale): readonly string[] =>
  Array.isArray(translations[locale]?.[key])
    ? (translations[locale]![key] as readonly string[])
    : [];

export const localeFromStorage = (): Locale | null => {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return stored === 'es' || stored === 'en' ? stored : null;
  } catch {
    return null;
  }
};

export const localeFromNavigator = (): Locale =>
  (navigator.language?.slice(0, 2) === 'en' ? 'en' : 'es');

export const saveLocale = (locale: Locale): void => {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch { /* noop */ }
};

export const resolveLocale = (): Locale =>
  localeFromStorage() ?? localeFromNavigator();
