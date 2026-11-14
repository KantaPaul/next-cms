import 'server-only';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';
import { validateSession } from '@/lib/auth';
import { adminLocale } from '@/server/services/admin-locale';
import { type UiLocale, resolveUiLocale } from './config';
import type { MessageNamespace } from './request';

/**
 * The admin UI language for this request: the user's own setting, else the
 * content locale from the URL when a dictionary exists for it, else English.
 * The dashboard layout and server components both use this, so they agree.
 */
export const adminUiLocale = cache(async (): Promise<UiLocale> => {
  const [session, contentLocale] = await Promise.all([
    validateSession(),
    adminLocale(),
  ]);
  const userUiLocale = (session?.user as { uiLocale?: string | null } | undefined)
    ?.uiLocale;
  return resolveUiLocale({ userUiLocale, contentLocale });
});

/**
 * `getTranslations` for admin server components. Plain `getTranslations()`
 * would fall back to English, because the admin has no next-intl routing to
 * tell it the locale.
 */
export async function getAdminTranslations<N extends MessageNamespace>(
  namespace: N
) {
  return getTranslations({ locale: await adminUiLocale(), namespace });
}
