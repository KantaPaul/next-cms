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
import { SAMPLE_POST } from '@/builder/post-template';
import { getAdminSiteContext } from '@/server/services/site-context';
import {
  entryRenderContext,
  previewEntryId,
} from '@/app/(admin)/dashboard/(fullscreen)/_editor/entry-context';

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

  // Preview entry: `?entry=<id>` (the "Preview with" picker), else the latest
  // published entry in the site's default language.
  const query = await searchParams;
  const requested = Array.isArray(query.entry) ? query.entry[0] : query.entry;
  const { defaultLocale } = await getAdminSiteContext(userId);
  const entryId = await previewEntryId(collection.id, requested, defaultLocale);
  const preview = entryId
    ? await entryRenderContext(entryId, collection)
    : null;
  const fields = preview
    ? null
    : await collectionsService.getFields(collection.id);
  const previewEntry = preview?.collectionEntry ?? {
    collection: {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      fields,
    },
    data: {},
  };
  const previewPost = preview?.post ?? SAMPLE_POST;

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
        language: preview?.language ?? defaultLocale,
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
