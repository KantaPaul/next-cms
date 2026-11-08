import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import type { SiteTemplateCategory } from '@/db/seed/header-footer-starters';
import { HeaderFooterList } from './_components/header-footer-list';
import {
  headerFooterService,
  type HeaderFooterItem,
} from './_modules/header-footer.service';
import { paginate } from '@/db/helpers/with-pagination';

const TITLE = 'Site templates';

export const metadata = {
  ...metaObject(TITLE),
};

const TYPE_TO_CATEGORY: Record<string, SiteTemplateCategory> = {
  header: 'Header',
  footer: 'Footer',
  search: 'Search',
  archive: 'Archive',
  megamenu: 'MegaMenu',
  popup: 'Popup',
  drawer: 'Drawer',
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? '';

const statusOf = (i: HeaderFooterItem) =>
  !i.isPublished ? 'draft' : i.hasDraftChanges ? 'changes' : 'published';

export default async function HeaderFooterPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const initialTab =
    TYPE_TO_CATEGORY[one(params.type).toLowerCase()] ?? 'Header';
  const { access, allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.HEADER_FOOTER },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="site templates" />
      </>
    );
  }

  const items = await headerFooterService.listHeaderFooters();
  const tabCounts = Object.fromEntries(
    Object.values(TYPE_TO_CATEGORY).map(c => [
      c,
      items.filter(i => i.category === c).length,
    ])
  ) as Record<SiteTemplateCategory, number>;

  // The table filters and pages in the URL, like the Posts list.
  const inTab = items.filter(i => i.category === initialTab);
  const search = one(params.search).trim().toLowerCase();
  const status = one(params.status);
  const assigned = one(params.assigned);
  const filtered = inTab.filter(
    i =>
      (!search || i.name.toLowerCase().includes(search)) &&
      (!status || statusOf(i) === status) &&
      (!assigned ||
        (assigned === 'default' && i.isSiteDefault) ||
        (assigned === 'in-use' && i.inUse) ||
        (assigned === 'unused' && !i.inUse))
  );
  // Same page math as the Posts list (1-based `page`).
  const { offset, limit } = paginate({
    page: one(params.page) || undefined,
    size: one(params.size) || undefined,
  });
  const rows = filtered.slice(offset, offset + limit);

  const isOverlayTab = initialTab === 'Popup' || initialTab === 'Drawer';
  const totalViews = inTab.reduce(
    (acc, i) => acc + (i.overlayStats?.views ?? 0),
    0
  );
  const totalConversions = inTab.reduce(
    (acc, i) => acc + (i.overlayStats?.conversions ?? 0),
    0
  );
  const avgConvRate =
    totalViews > 0 ? (totalConversions / totalViews) * 100 : 0;

  const kpis = isOverlayTab
    ? [
        { label: 'Total', value: inTab.length },
        {
          label: 'Enabled',
          value: inTab.filter(i => i.overlaySettings?.enabled ?? true).length,
        },
        { label: '30d Views', value: totalViews },
        { label: '30d Conversions', value: totalConversions },
        { label: 'Avg Conv. Rate', value: `${avgConvRate.toFixed(1)}%` },
      ]
    : [
        { label: 'Total', value: inTab.length },
        {
          label: 'Published',
          value: inTab.filter(i => statusOf(i) === 'published').length,
        },
        {
          label: 'Draft changes',
          value: inTab.filter(i => statusOf(i) !== 'published').length,
        },
        { label: 'In use', value: inTab.filter(i => i.inUse).length },
        { label: 'Unused', value: inTab.filter(i => !i.inUse).length },
      ];

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <HeaderFooterList
        rows={rows}
        allItems={items.map(i => ({ id: i.id, name: i.name }))}
        totalCount={filtered.length}
        tabCounts={tabCounts}
        kpis={kpis}
        initialTab={initialTab}
        can={{
          create: access.permissions.includes(PERMISSIONS.PAGES_CREATE),
          delete: access.permissions.includes(PERMISSIONS.PAGES_DELETE),
        }}
      />
    </>
  );
}
