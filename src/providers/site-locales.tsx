'use client';

import { createContext, useContext } from 'react';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from '@/db/schemas/shared.schema';

export type LocaleOption = { value: string; label: string };

const fallback: { locales: LocaleOption[]; defaultLocale: string } = {
  locales: SUPPORTED_LANGUAGES.map(language => ({
    value: language.value,
    label: language.label,
  })),
  defaultLocale: DEFAULT_LANGUAGE,
};

const SiteLocalesContext = createContext(fallback);

export function SiteLocalesProvider({
  locales,
  defaultLocale,
  children,
}: {
  locales: { code: string; label: string }[];
  defaultLocale: string;
  children: React.ReactNode;
}) {
  const value = {
    locales: locales.length
      ? locales.map(locale => ({ value: locale.code, label: locale.label }))
      : fallback.locales,
    defaultLocale: defaultLocale || fallback.defaultLocale,
  };
  return (
    <SiteLocalesContext.Provider value={value}>
      {children}
    </SiteLocalesContext.Provider>
  );
}

export function useSiteLocales() {
  return useContext(SiteLocalesContext);
}
