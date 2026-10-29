import { notFound, redirect } from 'next/navigation';
import { BuilderOrNewEditor } from '@/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor';
import { postTemplatesService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { NotFoundException } from '@/lib/utils/error';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const metadata = metaObject('Post template');

export default async function PostTemplateBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!accessService.can(access, PERMISSIONS.PAGES_PUBLISH))
    redirect(PAGES.DASHBOARD.POSTS.INDEX);

  const [template, settings] = await Promise.all([
    postTemplatesService.getForEditor(id).catch(error => {
      if (error instanceof NotFoundException) notFound();
      throw error;
    }),
    siteSettingsService.get(),
  ]);

  return (
    <BuilderOrNewEditor
      searchParams={searchParams}
      kind="post-template"
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
      }}
      themeTokens={settings.themeTokens}
    />
  );
}
