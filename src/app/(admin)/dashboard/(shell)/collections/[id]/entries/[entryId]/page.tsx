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
import { EntryStatusCard } from '../../../components/entry-status-card';
import { DeleteEntryForm } from '../../../components/entry-status-card';

export default async function CollectionEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = await params;
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const collection = await collectionsService.get(id).catch(() => null);
  const entry = await collectionsService.getEntry(entryId).catch(() => null);

  if (!collection || !entry) return notFound();

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Collections', href: PAGES.DASHBOARD.COLLECTIONS },
    { title: collection.name, href: PAGES.DASHBOARD.COLLECTION(id) },
    { title: 'Entries', href: PAGES.DASHBOARD.COLLECTION_ENTRIES(id) },
    { title: entry.slug, href: PAGES.DASHBOARD.COLLECTION_ENTRY(id, entryId) },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={entry.slug} breadcrumbs={breadcrumbs} />
        <AccessDenied what="entry" />
      </>
    );
  }

  const fields = await collectionsService.getFields(id);
  const entryData = entry.data as Record<string, unknown> | undefined;

  return (
    <>
      <PageHeader title={entry.slug} breadcrumbs={breadcrumbs} />
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <EditEntryForm
              entryId={entry.id}
              collectionId={collection.id}
              entrySlug={entry.slug}
              entryData={entryData}
              fields={fields.map(f => ({
                key: f.key,
                label: f.label,
                type: f.type,
                required: f.required,
              }))}
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
