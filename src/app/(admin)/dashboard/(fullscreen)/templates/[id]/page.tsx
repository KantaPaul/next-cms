import type { Data } from '@measured/puck';
import { notFound, redirect } from 'next/navigation';
import { BuilderLoader } from '@/app/(admin)/dashboard/(fullscreen)/pages/[id]/builder/_components/builder-loader';
import { templatesService } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.service';
import { normalizeContent } from '@/builder/data';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const metadata = metaObject('Edit page template');

export default async function PageTemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_CREATE);
  if (!allowed) redirect(PAGES.DASHBOARD.TEMPLATES);

  const [template, settings] = await Promise.all([
    templatesService.getTemplate(id),
    siteSettingsService.get(),
  ]);
  if (!template) notFound();
  if (template.isSystem) redirect(PAGES.DASHBOARD.TEMPLATES);
  if (template.editorType !== 'builder') redirect(PAGES.DASHBOARD.TEMPLATES);

  const content = normalizeContent('builder', template.content) as Data;

  return (
    <BuilderLoader
      kind="page-template"
      page={{
        id: template.id,
        title: template.name,
        slug: template.id,
        language: 'en',
        isHome: false,
        status: 'published',
        hasUnpublishedChanges: false,
        content,
      }}
      themeTokens={settings.themeTokens}
    />
  );
}
