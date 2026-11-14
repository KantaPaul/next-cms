import 'server-only';
import { PAGES } from '@/config/pages';
import { getAdminTranslations } from '@/i18n/server';

/** Translated "Dashboard / Post types" crumbs that every Collections screen starts with. */
export async function postTypesCrumbs() {
  const t = await getAdminTranslations('nav');
  return [
    { title: t('dashboard'), href: PAGES.DASHBOARD.ROOT },
    { title: t('postTypes'), href: PAGES.DASHBOARD.COLLECTIONS },
  ];
}
