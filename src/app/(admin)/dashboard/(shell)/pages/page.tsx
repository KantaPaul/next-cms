import { PagesTable } from '@/app/(admin)/dashboard/(shell)/pages/_components/pages-table';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { pagesHeader } from '@/app/(admin)/dashboard/(shell)/pages/breadcrumbs';
import { getAdminTranslations } from '@/i18n/server';
import CreateButton from '@/components/atoms/buttons/create-button';
import { PageHeader } from '@/components/organisms/page-header';
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

export async function generateMetadata() {
  return metaObject((await pagesHeader()).title);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { userId } = await getCurrentUserAndTeamId();
  const [params, access] = await Promise.all([
    searchParams,
    accessService.getUserAccess(userId),
  ]);
  const [{ data, totalCount }, counts] = await Promise.all([
    pagesServices.getPaginated(parseSearchParams(params)),
    pagesServices.getStatusCounts(),
  ]);
  const siteSlug = siteSlugPrefix(await siteContext.publicSite());
  const [{ title, breadcrumbs }, t, tCommon] = await Promise.all([
    pagesHeader(),
    getAdminTranslations('pages'),
    getAdminTranslations('common'),
  ]);
  const tStatus = (status: string) => tCommon(`statuses.${status}` as never);

  return (
    <>
      <PageHeader title={title} breadcrumbs={breadcrumbs}>
        {access.permissions.includes(PERMISSIONS.PAGES_CREATE) && (
          <CreateButton href={PAGES.DASHBOARD.PAGES.CREATE} text={t('newPage')} />
        )}
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
              {tStatus(status)}
            </div>
            <div className="text-2xl font-semibold">{counts[status] ?? 0}</div>
          </div>
        ))}
      </div>
      <PagesTable data={data} totalCount={totalCount} siteSlug={siteSlug} />
    </>
  );
}
