import { redirect } from 'next/navigation';
import { getAdminTranslations } from '@/i18n/server';
import { CreateOrUpdatePost } from '@/app/(admin)/dashboard/(shell)/posts/create-update';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';

export async function generateMetadata() {
  const t = await getAdminTranslations('posts');
  return metaObject(t('editPost'));
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!access.permissions.includes(PERMISSIONS.PAGES_EDIT))
    redirect(PAGES.DASHBOARD.POSTS.INDEX);

  return <CreateOrUpdatePost id="edit-post-form" postId={id} />;
}
