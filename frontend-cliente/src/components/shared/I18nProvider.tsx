import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { I18nContext, createT } from '../../hooks/useI18n';
import type { Locale } from '../../i18n';
import { resolveLocale, saveLocale } from '../../i18n';

export default function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveLocale);

  const setLocale = useCallback((l: Locale) => {
    saveLocale(l);
    setLocaleState(l);
  }, []);

  const value = useMemo(() => ({
    ...createT(locale),
    setLocale,
  }), [locale, setLocale]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
