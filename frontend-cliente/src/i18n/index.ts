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

const safeStorage = {
  getItem: (key: string): string | null => {
    const storage = globalThis.localStorage;
    return storage ? storage.getItem(key) : null;
  },
  setItem: (key: string, value: string): void => {
    const storage = globalThis.localStorage;
    if (storage) storage.setItem(key, value);
  },
};

export const localeFromStorage = (): Locale | null => {
  const stored = safeStorage.getItem(STORAGE_KEY);
  return stored === 'es' || stored === 'en' ? stored : null;
};

export const localeFromNavigator = (): Locale =>
  navigator.language?.slice(0, 2) === 'en' ? 'en' : 'es';

export const saveLocale = (locale: Locale): void => {
  safeStorage.setItem(STORAGE_KEY, locale);
};

export const resolveLocale = (): Locale =>
  localeFromStorage() ?? localeFromNavigator();
