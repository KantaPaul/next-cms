import { redirect } from 'next/navigation';
import { getAdminTranslations } from '@/i18n/server';
import { CreateOrUpdate } from '@/app/(admin)/dashboard/(shell)/pages/create-update';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';

export async function generateMetadata() {
  const t = await getAdminTranslations('pages');
  return metaObject(t('newPage'));
}

export default async function CreatePage() {
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!access.permissions.includes(PERMISSIONS.PAGES_CREATE))
    redirect(PAGES.DASHBOARD.PAGES.INDEX);

  return <CreateOrUpdate id="add-page-form" />;
}
