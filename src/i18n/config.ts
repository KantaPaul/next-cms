export const UI_LOCALES = ['en', 'es', 'ar'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const UI_LOCALE_LABELS: Record<UiLocale, string> = {
  en: 'English',
  es: 'Español',
  ar: 'العربية',
};

export const RTL_LOCALES = new Set<string>(['ar']);

export function isUiLocale(value: string | null | undefined): value is UiLocale {
  return Boolean(value && (UI_LOCALES as readonly string[]).includes(value));
}

export function dirFor(locale: string | null | undefined): 'ltr' | 'rtl' {
  if (!locale) return 'ltr';
  const base = locale.split('-')[0]?.toLowerCase() ?? '';
  return RTL_LOCALES.has(base) ? 'rtl' : 'ltr';
}

export function resolveUiLocale({
  userUiLocale,
  contentLocale,
}: {
  userUiLocale?: string | null;
  contentLocale?: string | null;
}): UiLocale {
  if (isUiLocale(userUiLocale)) return userUiLocale;
  if (isUiLocale(contentLocale)) return contentLocale;
  return 'en';
}
