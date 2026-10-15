import { redirect } from 'next/navigation';
import { TITLE } from '@/app/(admin)/dashboard/(shell)/pages/breadcrumbs';
import { CreateOrUpdate } from '@/app/(admin)/dashboard/(shell)/pages/create-update';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';

export const metadata = {
  ...metaObject(`Edit ${TITLE}`),
};

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!access.permissions.includes(PERMISSIONS.PAGES_EDIT)) redirect(PAGES.DASHBOARD.PAGES.INDEX);

  return <CreateOrUpdate id="edit-page-form" pageId={id} />;
}
