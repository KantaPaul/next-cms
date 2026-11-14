/**
 * Cookie remembering the user's last selected dashboard content locale so that
 * visiting `/dashboard` without a locale prefix can redirect back to it.
 */
export const ADMIN_LOCALE_COOKIE = 'cms_locale';

/** The cookie's value if it names one of the site's locales, else null. */
export function pickAdminLocale(
  value: string | null | undefined,
  locales: { code: string }[]
): string | null {
  if (!value) return null;
  const code = decodeURIComponent(value);
  return locales.some(locale => locale.code === code) ? code : null;
}
