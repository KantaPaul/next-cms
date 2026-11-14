import 'server-only';
import { PAGES } from '@/config/pages';
import { getAdminTranslations } from '@/i18n/server';

/** Translated title and breadcrumbs for the Pages screens. */
export async function pagesHeader() {
  const t = await getAdminTranslations('nav');
  const title = t('pages');
  return {
    title,
    breadcrumbs: [
      { title: t('dashboard'), href: PAGES.DASHBOARD.ROOT },
      { title, href: PAGES.DASHBOARD.PAGES.INDEX },
    ],
  };
}
