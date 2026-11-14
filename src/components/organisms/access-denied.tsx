import { ShieldAlert } from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { PAGES } from '@/config/pages';
import { getAdminTranslations } from '@/i18n/server';

/**
 * Shown in place of an admin screen the user's role can't open. The page
 * header above it already names the area, so the message stays generic and
 * translates cleanly.
 */
export async function AccessDenied() {
  const t = await getAdminTranslations('common');
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-steel-200 px-6 py-16 text-center dark:border-dark-300">
      <ShieldAlert className="size-10 text-amber-500" />
      <h3 className="text-lg font-semibold">{t('accessDenied.title')}</h3>
      <p className="max-w-md text-sm text-steel-500">{t('accessDenied.body')}</p>
      <Link
        href={PAGES.DASHBOARD.ROOT}
        className="text-sm font-medium text-indigo-600 hover:underline"
      >
        {t('accessDenied.back')}
      </Link>
    </div>
  );
}
