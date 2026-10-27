import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/server/services/require-permission';
import { collectionsService } from '@/server/services/collections.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionSettingsForm } from '../components/collection-settings-form';
import { AddFieldForm } from '../components/add-field-form';
import { FieldList } from '../components/field-list';

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const collection = await collectionsService.get(id).catch(() => null);

  if (!collection) return notFound();

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Collections', href: PAGES.DASHBOARD.COLLECTIONS },
    { title: collection.name, href: PAGES.DASHBOARD.COLLECTION(id) },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={collection.name} breadcrumbs={breadcrumbs} />
        <AccessDenied what="collection fields" />
      </>
    );
  }

  const fields = await collectionsService.getFields(id);

  return (
    <>
      <PageHeader title={collection.name} breadcrumbs={breadcrumbs} />
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <CollectionSettingsForm collection={collection} />
          </CardContent>
        </Card>
        <div className="lg:col-span-8">
          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Fields
            </h2>
            <AddFieldForm collectionId={collection.id} />
          </div>
          <FieldList fields={fields} collectionId={collection.id} />
        </div>
      </div>
    </>
  );
}
