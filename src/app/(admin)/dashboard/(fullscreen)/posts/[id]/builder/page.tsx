import { notFound, redirect } from 'next/navigation';
import { BuilderLoader } from '@/app/(admin)/dashboard/(fullscreen)/pages/[id]/builder/_components/builder-loader';
import { postsService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { blogService } from '@/server/services/blog.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const metadata = metaObject('Post layout builder');

export default async function PostBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!accessService.can(access, PERMISSIONS.PAGES_EDIT))
    redirect(PAGES.DASHBOARD.POSTS.INDEX);

  const [post, draft, settings] = await Promise.all([
    postsService.getById({ id }),
    blogService.getDraftById(id),
    siteSettingsService.get(),
  ]);
  if (!post) notFound();
  if (post.layout !== 'custom' || !post.canvas)
    redirect(PAGES.DASHBOARD.POSTS.EDIT(id));

  return (
    <BuilderLoader
      kind="post"
      post={draft?.view}
      page={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        language: post.language,
        isHome: false,
        status: post.status,
        hasUnpublishedChanges: post.hasUnpublishedChanges,
        content: post.canvas,
      }}
      themeTokens={settings.themeTokens}
    />
  );
}
