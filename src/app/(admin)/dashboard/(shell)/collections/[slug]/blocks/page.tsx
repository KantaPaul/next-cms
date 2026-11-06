import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { collectionBlocksService } from '@/server/services/collection-blocks.service';
import { requirePermission } from '@/server/services/require-permission';
import { loadPostTypeRoute } from '../../_modules/post-type-route';
import { CollectionBlocksTable } from '../../components/collection-blocks-table';

export default async function CollectionBlocksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await loadPostTypeRoute(
    slug,
    PAGES.DASHBOARD.COLLECTION_BLOCKS
  );
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Post types', href: PAGES.DASHBOARD.COLLECTIONS },
    {
      title: collection.name,
      href: PAGES.DASHBOARD.COLLECTION(collection.slug),
    },
    {
      title: 'Blocks',
      href: PAGES.DASHBOARD.COLLECTION_BLOCKS(collection.slug),
    },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={`Blocks · ${collection.name}`} breadcrumbs={breadcrumbs} />
        <AccessDenied what="blocks" />
      </>
    );
  }

  const blocks = await collectionBlocksService.listByCollection(collection.id);

  return (
    <>
      <PageHeader
        title={`Blocks · ${collection.name}`}
        breadcrumbs={breadcrumbs}
      />
      <CollectionBlocksTable
        collectionId={collection.id}
        collectionSlug={collection.slug}
        blocks={blocks}
      />
    </>
  );
}
