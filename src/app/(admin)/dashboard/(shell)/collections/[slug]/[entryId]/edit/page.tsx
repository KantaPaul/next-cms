import { notFound } from 'next/navigation';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { collectionsService } from '@/server/services/collections.service';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';
import { requirePermission } from '@/server/services/require-permission';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { toEntryFieldConfigs } from '../../../_modules/entry-fields';
import { loadPostTypeRoute } from '../../../_modules/post-type-route';
import { EntryEditor } from '../../../components/entry-editor';

export default async function CollectionEntryPage({
  params,
}: {
  params: Promise<{ slug: string; entryId: string }>;
}) {
  const { slug, entryId } = await params;
  const collection = await loadPostTypeRoute(slug, s =>
    PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(s, entryId)
  );
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);

  if (!allowed) {
    return (
      <>
        <PageHeader title={collection.name} />
        <AccessDenied what="entry" />
      </>
    );
  }

  const entry = await collectionsService
    .getEntryWithDetails(entryId)
    .catch(() => null);
  if (!entry || entry.collectionId !== collection.id) return notFound();

  const [fields, taxonomies, templates, translations] = await Promise.all([
    collectionsService.getFields(collection.id),
    collectionTaxonomiesService.listTaxonomies(collection.id),
    collectionTemplatesService.options(collection.id),
    collectionsService.getEntryTranslations(entry.translationGroupId, entry.id),
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
    <div className="-m-5 xl:-m-8">
      <EntryEditor
        collection={collection}
        entry={entry}
        fields={fieldConfigs}
        taxonomies={taxonomies}
        termsByTaxonomy={termsByTaxonomy}
        templates={templates}
        currentUserName={userId || null}
        translations={translations}
      />
    </div>
  );
}
