import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { collectionsService } from '@/server/services/collections.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionList } from './components/collection-list';
import { CreateCollectionForm } from './components/create-collection-form';

const TITLE = 'Collections';

export const metadata = { ...metaObject(TITLE) };

export default async function CollectionsPage() {
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.COLLECTIONS },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="collections" />
      </>
    );
  }

  const rows = await collectionsService.list();

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Create collection</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateCollectionForm />
          </CardContent>
        </Card>
        <div className="lg:col-span-8">
          <CollectionList rows={rows} />
        </div>
      </div>
    </>
  );
}
