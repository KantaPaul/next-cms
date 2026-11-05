import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/server/services/require-permission';
import { collectionsService } from '@/server/services/collections.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditEntryForm } from '../../../components/edit-entry-form';
import { toEntryFieldConfigs } from '../../../_modules/entry-fields';
import { loadPostTypeRoute } from '../../../_modules/post-type-route';
import { EntryStatusCard } from '../../../components/entry-status-card';
import { DeleteEntryForm } from '../../../components/entry-status-card';

export default async function CollectionEntryPage({
  params,
}: {
  params: Promise<{ slug: string; entryId: string }>;
}) {
  const { slug, entryId } = await params;
  const collection = await loadPostTypeRoute(slug, s =>
    PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(s, entryId)
  );
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const entry = await collectionsService.getEntry(entryId).catch(() => null);

  // The entry must belong to the post type in the URL.
  if (!entry || entry.collectionId !== collection.id) return notFound();

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Post types', href: PAGES.DASHBOARD.COLLECTIONS },
    {
      title: collection.name,
      href: PAGES.DASHBOARD.COLLECTION(collection.slug),
    },
    {
      title: entry.slug,
      href: PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(collection.slug, entryId),
    },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={entry.slug} breadcrumbs={breadcrumbs} />
        <AccessDenied what="entry" />
      </>
    );
  }

  const fields = await collectionsService.getFields(collection.id);
  const fieldConfigs = await toEntryFieldConfigs(fields);
  const entryData = entry.data as Record<string, unknown> | undefined;

  return (
    <>
      <PageHeader title={entry.slug} breadcrumbs={breadcrumbs} />
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>{collection.singularName || 'Entry'}</CardTitle>
          </CardHeader>
          <CardContent>
            <EditEntryForm
              entryId={entry.id}
              collectionId={collection.id}
              entrySlug={entry.slug}
              entryData={entryData}
              fields={fieldConfigs}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-4">
          <EntryStatusCard
            entryId={entry.id}
            collectionId={collection.id}
            status={entry.status}
          />
          <DeleteEntryForm
            entryId={entry.id}
            collectionId={collection.id}
            entrySlug={entry.slug}
          />
        </div>
      </div>
    </>
  );
}
