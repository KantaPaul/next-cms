import { notFound, redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { BuilderLoader } from './_components/builder-loader';

export const metadata = metaObject('Visual builder');

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) redirect(PAGES.DASHBOARD.PAGES.INDEX);

  const [page, settings] = await Promise.all([pagesServices.getById({ id }), siteSettingsService.get()]);
  if (!page) notFound();
  if (page.editorType !== 'builder') redirect(PAGES.DASHBOARD.PAGES.EDIT(id));

  return (
    <BuilderLoader
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        language: page.language,
        isHome: page.isHome,
        status: page.status,
        hasUnpublishedChanges: page.hasUnpublishedChanges,
        content: page.content,
      }}
      themeTokens={settings.themeTokens}
    />
  );
}
