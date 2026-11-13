import { notFound, redirect } from 'next/navigation';
import { BuilderOrNewEditor } from '@/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { collectionsService } from '@/server/services/collections.service';
import { OtherSiteNotice } from '@/components/organisms/other-site-notice';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { siteContext } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const metadata = metaObject('Visual builder');

export default async function BuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!accessService.can(access, PERMISSIONS.PAGES_EDIT))
    redirect(PAGES.DASHBOARD.PAGES.INDEX);

  const [page, settings, collection] = await Promise.all([
    pagesServices.getById({ id }),
    siteSettingsService.get(),
    collectionsService.findByTemplatePageId(id).catch(() => null),
  ]);
  if (!page) {
    // The page may exist in another site this user can open.
    const owningSiteId = await pagesServices.findOwningSite({ id });
    const membership = owningSiteId
      ? (await siteContext.memberships(userId)).find(
          row => row.siteId === owningSiteId
        )
      : undefined;
    if (!membership) notFound();
    return (
      <OtherSiteNotice
        siteId={membership.siteId}
        siteName={membership.siteName}
        backHref={PAGES.DASHBOARD.PAGES.INDEX}
      />
    );
  }
  if (page.editorType !== 'builder') redirect(PAGES.DASHBOARD.PAGES.EDIT(id));

  const collectionEntry = collection
    ? await collectionsService.getPreviewEntryForCollection(collection.id).catch(() => null)
    : null;

  return (
    <BuilderOrNewEditor
      searchParams={searchParams}
      page={{
        id: page.id,
        siteId: page.siteId,
        title: page.title,
        slug: page.slug,
        language: page.language,
        isHome: page.isHome,
        status: page.status,
        hasUnpublishedChanges: page.hasUnpublishedChanges,
        content: page.content,
      }}
      themeTokens={settings.themeTokens}
      customFonts={settings.customFonts}
      draftVersion={page.draftVersion}
      collectionEntry={collectionEntry}
    />
  );
}
