import Link from 'next/link';
import { PostTypeIcon } from '@/components/atoms/post-type-icon';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { collectionsService } from '@/server/services/collections.service';
import { requirePermission } from '@/server/services/require-permission';
import { loadPostTypeRoute } from '../_modules/post-type-route';
import { EntryList } from '../components/entry-list';

/** One post type's entries: `/dashboard/collections/{slug}` (like Pages). */
export default async function CollectionEntriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
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

  const [fields, entries] = await Promise.all([
    collectionsService.getFields(collection.id),
    collectionsService.listEntries(collection.id),
  ]);
  const singular = collection.singularName || 'Entry';
  const entriesData = entries.map(e => ({
    ...e,
    data: e.data as Record<string, unknown> | undefined,
  }));

  // Up to three text fields as columns
  const textFields = fields
    .filter(f => f.type === 'text')
    .slice(0, 3)
    .map(f => f.key);

  return (
    <>
      <PageHeader title={collection.name} breadcrumbs={breadcrumbs} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <PostTypeIcon name={collection.icon} className="size-4" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">{collection.name}</h1>
            <p className="text-sm text-muted-foreground">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              {collection.description ? ` · ${collection.description}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={PAGES.DASHBOARD.COLLECTION_SETTINGS(collection.slug)}>
              Fields & settings
            </Link>
          </Button>
          <Button asChild>
            <Link href={PAGES.DASHBOARD.COLLECTION_CREATE(collection.slug)}>
              New {singular.toLowerCase()}
            </Link>
          </Button>
        </div>
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

      <EntryList
        entries={entriesData}
        textFields={textFields}
        fields={fields.map(f => ({ key: f.key, label: f.label }))}
        collectionId={collection.id}
        collectionSlug={collection.slug}
      />
    </>
  );
}
