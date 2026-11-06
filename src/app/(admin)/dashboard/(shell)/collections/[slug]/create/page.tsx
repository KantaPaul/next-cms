import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { collectionsService } from '@/server/services/collections.service';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';
import { requirePermission } from '@/server/services/require-permission';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { toEntryFieldConfigs } from '../../_modules/entry-fields';
import { loadPostTypeRoute } from '../../_modules/post-type-route';
import { EntryEditor } from '../../components/entry-editor';

/** New entry: `/dashboard/collections/{slug}/create` (post-style editor). */
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

  const [fields, taxonomies, templates] = await Promise.all([
    collectionsService.getFields(collection.id),
    collectionTaxonomiesService.listTaxonomies(collection.id),
    collectionTemplatesService.options(collection.id),
  ]);

  const fieldConfigs = await toEntryFieldConfigs(fields);

  const termsByTaxonomy: Record<string, any[]> = {};
  await Promise.all(
    taxonomies.map(async tax => {
      termsByTaxonomy[tax.id] =
        await collectionTaxonomiesService.listTerms(tax.id);
    })
  );

  const { userId } = await getCurrentUserAndTeamId().catch(() => ({
    userId: '',
  }));

  return (
    <div className="-m-5 lg:h-[calc(100svh-4rem)] xl:-m-8">
      <EntryEditor
        collection={collection}
        fields={fieldConfigs}
        taxonomies={taxonomies}
        termsByTaxonomy={termsByTaxonomy}
        templates={templates}
        currentUserName={userId || null}
      />
    </div>
  );
}
