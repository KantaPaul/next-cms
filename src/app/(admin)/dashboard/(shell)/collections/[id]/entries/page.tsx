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
import { toEntryFieldConfigs } from '../../_modules/entry-fields';
import { PostTypeIcon } from '@/components/atoms/post-type-icon';

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
    { title: 'Post types', href: PAGES.DASHBOARD.COLLECTIONS },
    { title: collection.name, href: PAGES.DASHBOARD.COLLECTION_ENTRIES(id) },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={collection.name} breadcrumbs={breadcrumbs} />
        <AccessDenied what="entries" />
      </>
    );
  }

  const fields = await collectionsService.getFields(id);
  const [entries, fieldConfigs] = await Promise.all([
    collectionsService.listEntries(id),
    toEntryFieldConfigs(fields),
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
      <div className="flex items-center justify-between mb-4">
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
        <Button asChild>
          <Link href="#new-entry">New {singular.toLowerCase()}</Link>
        </Button>
      </div>
      {fields.length === 0 && (
        <p className="mb-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          This post type has no fields yet.{' '}
          <Link
            href={PAGES.DASHBOARD.COLLECTION(id)}
            className="text-primary underline"
          >
            Add fields
          </Link>{' '}
          before creating entries.
        </p>
      )}

      <Card id="new-entry" className="mb-6 scroll-mt-20">
        <CardHeader>
          <CardTitle>New {singular.toLowerCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEntryForm
            collectionId={id}
            fields={fieldConfigs}
            singularName={singular}
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
