import { notFound, redirect } from 'next/navigation';
import { BuilderOrNewEditor } from '@/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor';
import { collectionsService } from '@/server/services/collections.service';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { adminSiteId } from '@/server/services/site-context';
import { entryRenderContext } from '@/app/(admin)/dashboard/(fullscreen)/_editor/entry-context';

export const metadata = metaObject('Entry custom layout builder');

export default async function CollectionEntryBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; entryId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, entryId } = await params;
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
    redirect(PAGES.DASHBOARD.COLLECTIONS);
  }

  const [collection, entry, settings] = await Promise.all([
    collectionsService.getBySlug(slug).catch(() => null),
    collectionsService.getEntryWithDetails(entryId).catch(() => null),
    siteSettingsService.get(),
  ]);

  if (!collection || !entry || entry.collectionId !== collection.id) {
    notFound();
  }

  if (entry.layout !== 'custom') {
    redirect(PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(slug, entryId));
  }

  const context = await entryRenderContext(entry.id, collection);
  if (!context) notFound();

  const content = entry.draftCanvas ?? entry.canvas;

  return (
    <BuilderOrNewEditor
      searchParams={searchParams}
      kind="entry"
      post={context.post}
      collectionEntry={context.collectionEntry}
      page={{
        id: entry.id,
        siteId: await adminSiteId(),
        title: entry.slug,
        slug: entry.slug,
        language: entry.language || 'en',
        isHome: false,
        status: entry.status,
        hasUnpublishedChanges: false,
        content,
        collectionSlug: collection.slug,
      }}
      themeTokens={settings.themeTokens}
      customFonts={settings.customFonts}
    />
  );
}
