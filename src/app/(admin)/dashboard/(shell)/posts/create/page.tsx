import { redirect } from 'next/navigation';
import { TITLE } from '@/app/(admin)/dashboard/(shell)/posts/breadcrumbs';
import { CreateOrUpdatePost } from '@/app/(admin)/dashboard/(shell)/posts/create-update';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';

export const metadata = {
  ...metaObject(`New ${TITLE}`),
};

export default async function CreatePostPage() {
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!access.permissions.includes(PERMISSIONS.PAGES_CREATE))
    redirect(PAGES.DASHBOARD.POSTS.INDEX);

  return <CreateOrUpdatePost id="add-post-form" />;
}
