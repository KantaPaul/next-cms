import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { collectionsService } from '@/server/services/collections.service';
import { requirePermission } from '@/server/services/require-permission';
import { toEntryFieldConfigs } from '../../_modules/entry-fields';
import { loadPostTypeRoute } from '../../_modules/post-type-route';
import { CreateEntryForm } from '../../components/create-entry-form';

/** New entry: `/dashboard/collections/{slug}/create` (like Pages). */
export default async function CreateCollectionEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await loadPostTypeRoute(
    slug,
    PAGES.DASHBOARD.COLLECTION_CREATE
  );
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const singular = collection.singularName || 'Entry';
  const title = `New ${singular.toLowerCase()}`;

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Post types', href: PAGES.DASHBOARD.COLLECTIONS },
    {
      title: collection.name,
      href: PAGES.DASHBOARD.COLLECTION(collection.slug),
    },
    { title, href: PAGES.DASHBOARD.COLLECTION_CREATE(collection.slug) },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <AccessDenied what="entries" />
      </>
    );
  }

  const fields = await collectionsService.getFields(collection.id);
  const fieldConfigs = await toEntryFieldConfigs(fields);

  return (
    <>
      <PageHeader title={title} breadcrumbs={breadcrumbs} />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEntryForm
            collectionId={collection.id}
            collectionSlug={collection.slug}
            fields={fieldConfigs}
            singularName={singular}
          />
        </CardContent>
      </Card>
    </>
  );
}
