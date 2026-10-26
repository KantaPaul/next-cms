import { redirect } from 'next/navigation';
import { TITLE } from '@/app/(admin)/dashboard/(shell)/pages/breadcrumbs';
import { CreateOrUpdate } from '@/app/(admin)/dashboard/(shell)/pages/create-update';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';

export const metadata = {
  ...metaObject(`New ${TITLE}`),
};

export default async function CreatePage() {
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!access.permissions.includes(PERMISSIONS.PAGES_CREATE))
    redirect(PAGES.DASHBOARD.PAGES.INDEX);

  return <CreateOrUpdate id="add-page-form" />;
}
