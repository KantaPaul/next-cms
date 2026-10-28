import { LayoutTemplate } from 'lucide-react';
import Link from 'next/link';
import { PostsTable } from '@/app/(admin)/dashboard/(shell)/posts/_components/posts-table';
import { postTemplatesService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import { postsService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';
import {
  breadcrumbs,
  TITLE,
} from '@/app/(admin)/dashboard/(shell)/posts/breadcrumbs';
import CreateButton from '@/components/atoms/buttons/create-button';
import { PageHeader } from '@/components/organisms/page-header';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import {
  parseSearchParams,
  type SearchParams,
} from '@/db/helpers/parse-search-params';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { userId } = await getCurrentUserAndTeamId();
  const [params, access] = await Promise.all([
    searchParams,
    accessService.getUserAccess(userId),
  ]);
  const [{ data, totalCount }, counts, templates] = await Promise.all([
    postsService.getPaginated(parseSearchParams(params)),
    postsService.getStatusCounts(),
    postTemplatesService.list(),
  ]);
  const siteSlug = siteSlugPrefix(await siteContext.publicSite());

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs}>
        <div className="flex items-center gap-2">
          {access.permissions.includes(PERMISSIONS.PAGES_PUBLISH) && (
            <Button variant="outline" asChild>
              <Link href={PAGES.DASHBOARD.POSTS.TEMPLATES}>
                <LayoutTemplate /> Post templates
              </Link>
            </Button>
          )}
          {access.permissions.includes(PERMISSIONS.PAGES_CREATE) && (
            <CreateButton href={PAGES.DASHBOARD.POSTS.CREATE} text="New post" />
          )}
        </div>
      </PageHeader>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {(
          ['published', 'draft', 'review', 'scheduled', 'archived'] as const
        ).map(status => (
          <div
            key={status}
            className="rounded-lg border border-steel-200 px-4 py-3 dark:border-dark-300"
          >
            <div className="text-xs uppercase tracking-wide text-steel-400">
              {status}
            </div>
            <div className="text-2xl font-semibold">{counts[status] ?? 0}</div>
          </div>
        ))}
      </div>
      <PostsTable
        data={data}
        totalCount={totalCount}
        templates={templates}
        siteSlug={siteSlug}
      />
    </>
  );
}
