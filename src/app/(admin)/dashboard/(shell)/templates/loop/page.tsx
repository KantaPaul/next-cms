import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { collectionsService } from '@/server/services/collections.service';
import { externalApisService } from '@/server/services/external-apis.service';
import { loopTemplatesService } from '@/server/services/loop-templates.service';
import { requirePermission } from '@/server/services/require-permission';
import { LoopTemplatesList } from './_components/loop-templates-list';

const TITLE = 'Loop Items';

export const metadata = { ...metaObject(TITLE) };

export default async function LoopTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { access, allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Templates & Globals', href: PAGES.DASHBOARD.TEMPLATES },
    { title: TITLE, href: PAGES.DASHBOARD.LOOP_TEMPLATES },
  ];
  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied />
      </>
    );
  }

  const [templates, collections, externalApis, params] = await Promise.all([
    loopTemplatesService.list(),
    collectionsService.list(),
    externalApisService.list(),
    searchParams,
  ]);
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const rawSource = one(params.source);
  const initialSource =
    rawSource === 'collection'
      ? 'collection'
      : rawSource === 'external-api'
        ? 'external-api'
        : 'posts';

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <LoopTemplatesList
        templates={templates}
        collections={collections.map(c => ({ id: c.id, name: c.name }))}
        externalApis={externalApis.map(a => ({ id: a.id, name: a.name }))}
        initialCreate={
          one(params.new) === '1'
            ? {
                sourceType: initialSource,
                collectionId: one(params.collectionId) ?? '',
                externalApiId: one(params.externalApiId) ?? '',
              }
            : null
        }
        can={{
          delete: access.permissions.includes(PERMISSIONS.PAGES_DELETE),
        }}
      />
    </>
  );
}
