import { createContext, useContext } from 'react';
import type { Locale } from '../i18n';
import { t as tPure, tArray as tArrayPure } from '../i18n';

export interface I18nContextValue {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly t: (key: string, vars?: Readonly<Record<string, string | number>>) => string;
  readonly tArray: (key: string) => readonly string[];
}

const interpolate = (str: string, vars?: Readonly<Record<string, string | number>>): string =>
  vars
    ? Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), str)
    : str;

export const I18nContext = createContext<I18nContextValue>({
  locale: 'es',
  setLocale: () => {},
  t: (key: string) => key,
  tArray: () => [],
});

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export const createT = (locale: Locale): I18nContextValue => ({
  locale,
  setLocale: () => {},
  t: (key: string, vars?: Readonly<Record<string, string | number>>) =>
    interpolate(tPure(key, locale), vars),
  tArray: (key: string) => tArrayPure(key, locale),
});
