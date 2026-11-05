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
  /** The dashboard's working language: the chosen one, else the default. */
  currentLocale: string;
  /** The language picked in the header (cms_locale cookie); null until one is picked. */
  chosenLocale: string | null;
  setCurrentLocale: (locale: string) => void;
};

const fallback: SiteLocalesContextValue = {
  locales: SUPPORTED_LANGUAGES.map(language => ({
    value: language.value,
    label: language.label,
  })),
  defaultLocale: DEFAULT_LANGUAGE,
  currentLocale: DEFAULT_LANGUAGE,
  chosenLocale: null,
  setCurrentLocale: () => {},
};

const SiteLocalesContext = createContext<SiteLocalesContextValue>(fallback);

export function SiteLocalesProvider({
  locales,
  defaultLocale,
  initialLocale = null,
  children,
}: {
  locales: { code: string; label: string }[];
  defaultLocale: string;
  /** From the cms_locale cookie, already checked against `locales`. */
  initialLocale?: string | null;
  children: React.ReactNode;
}) {
  const effectiveDefault = defaultLocale || fallback.defaultLocale;
  const [chosenLocale, setChosenLocale] = useState<string | null>(
    initialLocale
  );

  // A site switch can make the chosen language unknown: drop it then.
  useEffect(() => {
    setChosenLocale(current =>
      current && locales.some(locale => locale.code === current)
        ? current
        : initialLocale
    );
  }, [locales, initialLocale]);

  const currentLocale = chosenLocale ?? effectiveDefault;

  const value = useMemo(
    () => ({
      locales: locales.length
        ? locales.map(locale => ({ value: locale.code, label: locale.label }))
        : fallback.locales,
      defaultLocale: effectiveDefault,
      currentLocale,
      chosenLocale,
      setCurrentLocale: setChosenLocale,
    }),
    [locales, effectiveDefault, currentLocale, chosenLocale]
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
