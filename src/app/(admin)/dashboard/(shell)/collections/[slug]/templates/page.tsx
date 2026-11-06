import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
import { requirePermission } from '@/server/services/require-permission';
import { normalizePostTypeSupports } from '@/config/post-types';
import { loadPostTypeRoute } from '../../_modules/post-type-route';
import { PostTypeTabs } from '../../components/post-type-tabs';
import { CollectionTemplatesTable } from '../../components/collection-templates-table';

export default async function CollectionTemplatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await loadPostTypeRoute(
    slug,
    PAGES.DASHBOARD.COLLECTION_TEMPLATES
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
      title: 'Templates',
      href: PAGES.DASHBOARD.COLLECTION_TEMPLATES(collection.slug),
    },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={`Templates · ${collection.name}`} breadcrumbs={breadcrumbs} />
        <AccessDenied what="templates" />
      </>
    );
  }

  const [templates, taxonomies] = await Promise.all([
    collectionTemplatesService.list(collection.id),
    collectionTaxonomiesService.listTaxonomies(collection.id),
  ]);

  const supports = normalizePostTypeSupports(collection.supports);

  return (
    <>
      <PageHeader
        title={`Templates · ${collection.name}`}
        breadcrumbs={breadcrumbs}
      />
      <PostTypeTabs
        slug={collection.slug}
        taxonomies={taxonomies}
        supports={supports}
      />
      <CollectionTemplatesTable
        collectionId={collection.id}
        collectionSlug={collection.slug}
        templates={templates}
      />
    </>
  );
}
