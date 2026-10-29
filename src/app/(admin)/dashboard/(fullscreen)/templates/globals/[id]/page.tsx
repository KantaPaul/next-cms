import type { Data } from '@measured/puck';
import { notFound, redirect } from 'next/navigation';
import { BuilderOrNewEditor } from '@/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor';
import { templatesService } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.service';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const metadata = metaObject('Edit global block');

function normalizeGlobalContent(raw: unknown): Data {
  let content: Data['content'] = [];
  let zones: Data['zones'] = {};

  if (Array.isArray(raw)) {
    content = raw as Data['content'];
  } else if (raw && typeof raw === 'object') {
    const obj = raw as { content?: Data['content']; zones?: Data['zones'] };
    content = Array.isArray(obj.content) ? obj.content : [];
    zones = obj.zones && typeof obj.zones === 'object' ? obj.zones : {};
  }

  return {
    root: { props: {} },
    content,
    zones,
  };
}

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
