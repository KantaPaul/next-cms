import { notFound, redirect } from 'next/navigation';
import { BuilderOrNewEditor } from '@/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';
import { collectionsService } from '@/server/services/collections.service';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { NotFoundException } from '@/lib/utils/error';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { entryToPostView, SAMPLE_POST } from '@/builder/post-template';

export const metadata = metaObject('Single template builder');

export default async function CollectionTemplateBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, id } = await params;
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!accessService.can(access, PERMISSIONS.PAGES_PUBLISH)) {
    redirect(PAGES.DASHBOARD.COLLECTIONS);
  }

  const [collection, template, settings] = await Promise.all([
    collectionsService.getBySlug(slug).catch(() => null),
    collectionTemplatesService.getForEditor(id).catch(error => {
      if (error instanceof NotFoundException) notFound();
      throw error;
    }),
    siteSettingsService.get(),
  ]);

  if (!collection || template.collectionId !== collection.id) {
    notFound();
  }

  // Load a sample or real entry from this collection to preview blocks
  const entries = await collectionsService.listEntries(collection.id);
  let previewPost = SAMPLE_POST;
  let previewEntry: any = null;

  if (entries.length > 0 && entries[0]) {
    try {
      const detailed = await collectionsService.getEntryWithDetails(
        entries[0].id
      );
      const fields = await collectionsService.getFields(collection.id);
      previewEntry = {
        ...detailed,
        collection: { name: collection.name, slug: collection.slug, fields },
      };
      previewPost = entryToPostView(
        detailed,
        { name: collection.name, slug: collection.slug, fields },
        detailed.terms ?? []
      );
    } catch {
      // Fall back to SAMPLE_POST
    }
  }

  return (
    <BuilderOrNewEditor
      searchParams={searchParams}
      kind="entry-template"
      post={previewPost}
      collectionEntry={previewEntry}
      page={{
        id: template.id,
        title: template.name,
        slug: '',
        language: 'en',
        isHome: false,
        status:
          template.isPublished && !template.hasUnpublishedChanges
            ? 'published'
            : 'draft',
        hasUnpublishedChanges: template.hasUnpublishedChanges,
        content: template.draft,
        collectionSlug: collection.slug,
      }}
      themeTokens={settings.themeTokens}
    />
  );
}
