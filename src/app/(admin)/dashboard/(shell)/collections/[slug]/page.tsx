import Link from 'next/link';
import { LayoutTemplate, Settings } from 'lucide-react';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import CreateButton from '@/components/atoms/buttons/create-button';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { collectionsService } from '@/server/services/collections.service';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';
import { requirePermission } from '@/server/services/require-permission';
import {
  parseSearchParams,
  type SearchParams,
} from '@/db/helpers/parse-search-params';
import { loadPostTypeRoute } from '../_modules/post-type-route';
import { EntriesTable } from '../components/entries-table';
import { PostTypeTabs } from '../components/post-type-tabs';
import { normalizePostTypeSupports } from '@/config/post-types';

/** One post type's entries: `/dashboard/collections/{slug}` (mirroring `/dashboard/posts`). */
export default async function CollectionEntriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const collection = await loadPostTypeRoute(slug, PAGES.DASHBOARD.COLLECTION);
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Post types', href: PAGES.DASHBOARD.COLLECTIONS },
    {
      title: collection.name,
      href: PAGES.DASHBOARD.COLLECTION(collection.slug),
    },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={collection.name} breadcrumbs={breadcrumbs} />
        <AccessDenied what="entries" />
      </>
    );
  }

  const [rawSearchParams, fields, taxonomies, templates] = await Promise.all([
    searchParams,
    collectionsService.getFields(collection.id),
    collectionTaxonomiesService.listTaxonomies(collection.id),
    collectionTemplatesService.options(collection.id),
  ]);

  const parsedParams = parseSearchParams(rawSearchParams);
  const [{ data, totalCount }, counts] = await Promise.all([
    collectionsService.getPaginatedEntries({
      collectionId: collection.id,
      params: parsedParams,
    }),
    collectionsService.getStatusCounts(collection.id),
  ]);

  const supports = normalizePostTypeSupports(collection.supports);
  const singular = collection.singularName || 'Entry';

  return (
    <>
      <PageHeader title={collection.name} breadcrumbs={breadcrumbs}>
        <div className="flex items-center gap-2">
          {supports.template && (
            <Button variant="outline" asChild>
              <Link href={PAGES.DASHBOARD.COLLECTION_TEMPLATES(collection.slug)}>
                <LayoutTemplate className="size-4" /> Templates
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={PAGES.DASHBOARD.COLLECTION_SETTINGS(collection.slug)}>
              <Settings className="size-4" /> Settings
            </Link>
          </Button>
          <CreateButton
            href={PAGES.DASHBOARD.COLLECTION_CREATE(collection.slug)}
            text={`New ${singular.toLowerCase()}`}
          />
        </div>
      </PageHeader>

      <PostTypeTabs
        slug={collection.slug}
        taxonomies={taxonomies}
        supports={supports}
      />

      {/* KPI status cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(['published', 'draft', 'review', 'scheduled'] as const).map(
          status => (
            <div
              key={status}
              className="rounded-lg border border-steel-200 px-4 py-3 dark:border-dark-300"
            >
              <div className="text-xs uppercase tracking-wide text-steel-400">
                {status === 'review' ? 'Under review' : status}
              </div>
              <div className="text-2xl font-semibold">
                {counts[status] ?? 0}
              </div>
            </div>
          )
        )}
      </div>

      {fields.length === 0 && (
        <p className="mb-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          This post type has no fields yet.{' '}
          <Link
            href={PAGES.DASHBOARD.COLLECTION_SETTINGS(collection.slug)}
            className="text-primary underline"
          >
            Add fields
          </Link>{' '}
          before creating entries.
        </p>
      )}

      {/* Searchable, filterable, paginated entries table */}
      <EntriesTable
        data={data as any}
        totalCount={totalCount}
        collectionSlug={collection.slug}
        templates={templates}
        fields={fields}
      />
    </>
  );
}
