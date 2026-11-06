import { notFound } from 'next/navigation';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { normalizePostTypeSupports } from '@/config/post-types';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
import { requirePermission } from '@/server/services/require-permission';
import { loadPostTypeRoute } from '../../../_modules/post-type-route';
import { PostTypeTabs } from '../../../components/post-type-tabs';
import { TermManager } from '../../../components/term-manager';

export default async function CollectionTaxonomyPage({
  params,
}: {
  params: Promise<{ slug: string; key: string }>;
}) {
  const { slug, key } = await params;
  const collection = await loadPostTypeRoute(slug, PAGES.DASHBOARD.COLLECTION);
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Post types', href: PAGES.DASHBOARD.COLLECTIONS },
    {
      title: collection.name,
      href: PAGES.DASHBOARD.COLLECTION(collection.slug),
    },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={collection.name} breadcrumbs={breadcrumbs} />
        <AccessDenied what="taxonomies" />
      </>
    );
  }

  const [taxonomy] = await Promise.all([
    // collectionTaxonomiesService.listTaxonomies(collection.id),
    collectionTaxonomiesService.getTaxonomyByKey(collection.id, key),
  ]);

  if (!taxonomy) {
    notFound();
  }

  const terms = await collectionTaxonomiesService.listTerms(taxonomy.id);
  // const supports = normalizePostTypeSupports(collection.supports);

  return (
    <>
      <PageHeader
        title={`${taxonomy.name} · ${collection.name}`}
        breadcrumbs={[
          ...breadcrumbs,
          {
            title: taxonomy.name,
            href: PAGES.DASHBOARD.COLLECTION_TAXONOMY(collection.slug, key),
          },
        ]}
      />
      {/* <PostTypeTabs
        slug={collection.slug}
        taxonomies={taxonomies}
        supports={supports}
      /> */}
      <TermManager
        collectionSlug={collection.slug}
        taxonomy={taxonomy}
        terms={terms}
      />
    </>
  );
}
