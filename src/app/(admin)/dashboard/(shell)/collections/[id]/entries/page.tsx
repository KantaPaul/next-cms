import { Button } from '@/components/ui/button';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePermission } from '@/server/services/require-permission';
import { collectionsService } from '@/server/services/collections.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EntryList } from '../../components/entry-list';
import { CreateEntryForm } from '../../components/create-entry-form';

export default async function CollectionEntriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const collection = await collectionsService.get(id).catch(() => null);

  if (!collection) return notFound();

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Collections', href: PAGES.DASHBOARD.COLLECTIONS },
    { title: collection.name, href: PAGES.DASHBOARD.COLLECTION(id) },
    { title: 'Entries', href: PAGES.DASHBOARD.COLLECTION_ENTRIES(id) },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title="Entries" breadcrumbs={breadcrumbs} />
        <AccessDenied what="entries" />
      </>
    );
  }

  const fields = await collectionsService.getFields(id);
  const entries = await collectionsService.listEntries(id);
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
      <PageHeader title="Entries" breadcrumbs={breadcrumbs} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">{collection.name} entries</h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} entry{entries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href={PAGES.DASHBOARD.COLLECTION_ENTRY(id, 'new')}>
          <Button>New entry</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New entry</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEntryForm
            collectionId={id}
            fields={fields.map(f => ({
              key: f.key,
              label: f.label,
              type: f.type,
              required: f.required,
            }))}
          />
        </CardContent>
      </Card>

      <EntryList
        entries={entriesData}
        textFields={textFields}
        fields={fields.map(f => ({ key: f.key, label: f.label }))}
        collectionId={id}
      />
    </>
  );
}
