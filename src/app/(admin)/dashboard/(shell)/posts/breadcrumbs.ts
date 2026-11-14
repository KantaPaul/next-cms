import 'server-only';
import { PAGES } from '@/config/pages';
import { getAdminTranslations } from '@/i18n/server';

/** Translated title and breadcrumbs for the Posts screens. */
export async function postsHeader() {
  const t = await getAdminTranslations('nav');
  const title = t('posts');
  return {
    title,
    breadcrumbs: [
      { title: t('dashboard'), href: PAGES.DASHBOARD.ROOT },
      { title, href: PAGES.DASHBOARD.POSTS.INDEX },
    ],
  };
}
