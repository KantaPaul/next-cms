'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from '@/db/schemas/shared.schema';

export type LocaleOption = { value: string; label: string };

export type SiteLocalesContextValue = {
  locales: LocaleOption[];
  defaultLocale: string;
  currentLocale: string;
  setCurrentLocale: (locale: string) => void;
};

const fallback: SiteLocalesContextValue = {
  locales: SUPPORTED_LANGUAGES.map(language => ({
    value: language.value,
    label: language.label,
  })),
  defaultLocale: DEFAULT_LANGUAGE,
  currentLocale: DEFAULT_LANGUAGE,
  setCurrentLocale: () => {},
};

const SiteLocalesContext = createContext<SiteLocalesContextValue>(fallback);

export function SiteLocalesProvider({
  locales,
  defaultLocale,
  children,
}: {
  locales: { code: string; label: string }[];
  defaultLocale: string;
  children: React.ReactNode;
}) {
  const effectiveDefault = defaultLocale || fallback.defaultLocale;
  const [currentLocale, setCurrentLocale] = useState(effectiveDefault);

  useEffect(() => {
    setCurrentLocale(effectiveDefault);
  }, [effectiveDefault]);

  const value = useMemo(
    () => ({
      locales: locales.length
        ? locales.map(locale => ({ value: locale.code, label: locale.label }))
        : fallback.locales,
      defaultLocale: effectiveDefault,
      currentLocale: currentLocale || effectiveDefault,
      setCurrentLocale,
    }),
    [locales, effectiveDefault, currentLocale]
  );

  return (
    <SiteLocalesContext.Provider value={value}>
      {children}
    </SiteLocalesContext.Provider>
  );
}

export function useSiteLocales() {
  return useContext(SiteLocalesContext);
}
