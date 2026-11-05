import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { notFound } from 'next/navigation';
import { accessService } from '@/server/services/access.service';
import { requirePermission } from '@/server/services/require-permission';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
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
  const { allowed: canManage, access } = await requirePermission(
    PERMISSIONS.POST_TYPES_MANAGE
  );
  const allowed =
    canManage || accessService.can(access, PERMISSIONS.SETTINGS_MANAGE);
  const collection = await collectionsService.get(id).catch(() => null);

  if (!collection) return notFound();

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Post types', href: PAGES.DASHBOARD.COLLECTIONS },
    { title: collection.name, href: PAGES.DASHBOARD.COLLECTION(id) },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={collection.name} breadcrumbs={breadcrumbs} />
        <AccessDenied what="post type fields" />
      </>
    );
  }

  const [fields, templatePages, allTypes] = await Promise.all([
    collectionsService.getFields(id),
    pagesServices.listTemplateOptions(),
    collectionsService.list(),
  ]);

  return (
    <>
      <PageHeader title={collection.name} breadcrumbs={breadcrumbs} />
      <div className="mb-4 flex justify-end">
        <Button asChild>
          <Link href={PAGES.DASHBOARD.COLLECTION_ENTRIES(id)}>
            Manage {collection.name.toLowerCase()}
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <CollectionSettingsForm
              collection={collection}
              templatePages={templatePages}
            />
          </CardContent>
        </Card>
        <div className="grid gap-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Add field</CardTitle>
            </CardHeader>
            <CardContent>
              <AddFieldForm
                collectionId={collection.id}
                postTypes={allTypes
                  .filter(t => t.id !== collection.id)
                  .map(t => ({ id: t.id, name: t.name }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldList fields={fields} collectionId={collection.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
