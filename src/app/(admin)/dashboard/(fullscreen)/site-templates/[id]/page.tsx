import { notFound, redirect } from 'next/navigation';
import { BuilderOrNewEditor } from '@/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor';
import { templatesService } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.service';
import { normalizeGlobalContent } from '@/builder/normalize-global-content';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const metadata = metaObject('Edit site template');

export default async function HeaderFooterBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  if (!allowed) redirect(PAGES.DASHBOARD.HEADER_FOOTER);

  const [block, settings] = await Promise.all([
    templatesService.getGlobalBlock(id),
    siteSettingsService.get(),
  ]);

  if (!block) notFound();
  if (
    block.category !== 'Header' &&
    block.category !== 'Footer' &&
    block.category !== 'MegaMenu' &&
    block.category !== 'Popup' &&
    block.category !== 'Drawer'
  ) {
    notFound();
  }

  const kind =
    block.category === 'Header'
      ? 'header'
      : block.category === 'Footer'
        ? 'footer'
        : block.category === 'MegaMenu'
          ? 'mega-menu'
          : block.category === 'Popup'
            ? 'popup'
            : 'drawer';
  const isPublished = !!block.publishedAt;
  const hasUnpublishedChanges =
    !isPublished ||
    (block.updatedAt && block.publishedAt && new Date(block.updatedAt) > new Date(block.publishedAt)) ||
    JSON.stringify(block.content) !== JSON.stringify(block.publishedContent);

  return (
    <BuilderOrNewEditor
      searchParams={searchParams}
      kind={kind}
      category={block.category}
      page={{
        id: block.id,
        title: block.name,
        slug: block.id,
        language: 'en',
        isHome: false,
        status: isPublished && !hasUnpublishedChanges ? 'published' : 'draft',
        hasUnpublishedChanges,
        content: normalizeGlobalContent(block.content),
      }}
      themeTokens={settings.themeTokens}
      customFonts={settings.customFonts}
    />
  );
}
