import { notFound, redirect } from 'next/navigation';
import { BuilderOrNewEditor } from '@/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor';
import { templatesService } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.service';
import { normalizeGlobalContent } from '@/builder/normalize-global-content';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const metadata = metaObject('Edit global block');

export default async function GlobalBlockPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  if (!allowed) redirect(PAGES.DASHBOARD.TEMPLATES);

  const [block, settings] = await Promise.all([
    templatesService.getGlobalBlock(id),
    siteSettingsService.get(),
  ]);
  if (!block) notFound();
  if (block.category === 'contact-form') {
    redirect(PAGES.DASHBOARD.CONTACT_FORM(id));
  }
  if (block.category === 'Header' || block.category === 'Footer') {
    redirect(PAGES.DASHBOARD.HEADER_FOOTER_EDIT(id));
  }

  return (
    <BuilderOrNewEditor
      searchParams={searchParams}
      kind="global"
      category={block.category}
      page={{
        id: block.id,
        title: block.name,
        slug: block.id,
        language: 'en',
        isHome: false,
        status: 'published',
        hasUnpublishedChanges: false,
        content: normalizeGlobalContent(block.content),
      }}
      themeTokens={settings.themeTokens}
    />
  );
}
