import { notFound, redirect } from 'next/navigation';
import { BuilderOrNewEditor } from '@/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor';
import { collectionBlocksService } from '@/server/services/collection-blocks.service';
import { collectionsService } from '@/server/services/collections.service';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { NotFoundException } from '@/lib/utils/error';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { entryToPostView, SAMPLE_POST } from '@/builder/post-template';

export const metadata = metaObject('Collection block builder');

export default async function CollectionBlockBuilderPage({
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

  const [collection, block, settings] = await Promise.all([
    collectionsService.getBySlug(slug).catch(() => null),
    collectionBlocksService.getForEditor(id).catch(error => {
      if (error instanceof NotFoundException) notFound();
      throw error;
    }),
    siteSettingsService.get(),
  ]);

  if (!collection || block.collectionId !== collection.id) {
    notFound();
  }

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
        collection: {
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          fields,
        },
      };
      previewPost = entryToPostView(
        detailed,
        { name: collection.name, slug: collection.slug, fields },
        detailed.terms ?? []
      );
    } catch {
      // Fall back to SAMPLE_POST
    }
  } else {
    const fields = await collectionsService.getFields(collection.id);
    previewEntry = {
      collection: { id: collection.id, name: collection.name, slug: collection.slug, fields },
      data: {},
    };
  }

  return (
    <BuilderOrNewEditor
      searchParams={searchParams}
      kind="collection-block"
      post={previewPost}
      collectionEntry={previewEntry}
      page={{
        id: block.id,
        title: block.name,
        slug: '',
        language: 'en',
        isHome: false,
        status:
          block.isPublished && !block.hasUnpublishedChanges
            ? 'published'
            : 'draft',
        hasUnpublishedChanges: block.hasUnpublishedChanges,
        content: block.draft,
        collectionSlug: collection.slug,
      }}
      themeTokens={settings.themeTokens}
    />
  );
}
