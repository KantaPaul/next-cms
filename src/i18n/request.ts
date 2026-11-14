import { getRequestConfig } from 'next-intl/server';
import { UI_LOCALES, type UiLocale, isUiLocale } from './config';

export const MESSAGE_NAMESPACES = [
  'common',
  'nav',
  'pages',
  'posts',
  'collections',
  'media',
  'menus',
  'forms',
  'settings',
  'users',
  'analytics',
  'builder',
  'errors',
  'validation',
  'account',
] as const;

export type MessageNamespace = (typeof MESSAGE_NAMESPACES)[number];

export async function loadMessages(locale: UiLocale) {
  const entries = await Promise.all(
    MESSAGE_NAMESPACES.map(async (ns) => {
      const mod = await import(`./messages/${locale}/${ns}.json`);
      return [ns, mod.default] as const;
    })
  );
  return Object.fromEntries(entries);
}

export default getRequestConfig(async ({ locale }) => {
  const resolved: UiLocale = isUiLocale(locale) ? locale : UI_LOCALES[0];
  return {
    locale: resolved,
    messages: await loadMessages(resolved),
  };
});
