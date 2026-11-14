import { redirect } from 'next/navigation';
import { postTemplatesService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import { postsHeader } from '@/app/(admin)/dashboard/(shell)/posts/breadcrumbs';
import { getAdminTranslations } from '@/i18n/server';
import { PostTemplatesTable } from '@/app/(admin)/dashboard/(shell)/posts/templates/_components/templates-table';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';

export async function generateMetadata() {
  const t = await getAdminTranslations('posts');
  return metaObject(t('postTemplates'));
}

export default async function PostTemplatesPage() {
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!accessService.can(access, PERMISSIONS.PAGES_PUBLISH))
    redirect(PAGES.DASHBOARD.POSTS.INDEX);

  const [templates, t, { breadcrumbs: postsBreadcrumbs }] = await Promise.all([
    postTemplatesService.list(),
    getAdminTranslations('posts'),
    postsHeader(),
  ]);
  const title = t('postTemplates');

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={[
          ...postsBreadcrumbs,
          { title, href: PAGES.DASHBOARD.POSTS.TEMPLATES },
        ]}
      />
      <p className="-mt-2 mb-6 max-w-2xl text-sm text-steel-500">
        {t('templatesIntro')}
      </p>
      <PostTemplatesTable templates={templates} />
    </>
  );
}
