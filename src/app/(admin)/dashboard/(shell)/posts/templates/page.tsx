import { redirect } from 'next/navigation';
import { postTemplatesService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import { breadcrumbs as postsBreadcrumbs } from '@/app/(admin)/dashboard/(shell)/posts/breadcrumbs';
import { PostTemplatesTable } from '@/app/(admin)/dashboard/(shell)/posts/templates/_components/templates-table';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';

const TITLE = 'Post templates';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function PostTemplatesPage() {
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!accessService.can(access, PERMISSIONS.PAGES_PUBLISH))
    redirect(PAGES.DASHBOARD.POSTS.INDEX);

  const templates = await postTemplatesService.list();

  return (
    <>
      <PageHeader
        title={TITLE}
        breadcrumbs={[
          ...postsBreadcrumbs,
          { title: TITLE, href: PAGES.DASHBOARD.POSTS.TEMPLATES },
        ]}
      />
      <p className="-mt-2 mb-6 max-w-2xl text-sm text-steel-500">
        Single-post layouts. The default template applies to every post that
        hasn&rsquo;t picked another one. Assign a template to a post from the
        three-dot menu on the posts list.
      </p>
      <PostTemplatesTable templates={templates} />
    </>
  );
}
