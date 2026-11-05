import { notFound, redirect } from 'next/navigation';
import { BuilderOrNewEditor } from '@/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { loopTemplatePreviewData } from '@/server/loop-template-preview';
import { loopTemplatesService } from '@/server/services/loop-templates.service';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const metadata = metaObject('Edit loop item');

export default async function LoopTemplateEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  if (!allowed) redirect(PAGES.DASHBOARD.TEMPLATES);

  const [template, settings] = await Promise.all([
    loopTemplatesService.get(id),
    siteSettingsService.get(),
  ]);
  if (!template) notFound();

  const preview = await loopTemplatePreviewData(
    template.sourceType,
    template.collectionId
  );

  return (
    <BuilderOrNewEditor
      searchParams={searchParams}
      kind="loop-item"
      page={{
        id: template.id,
        title: template.name,
        slug: template.id,
        language: 'en',
        isHome: false,
        status: template.publishedAt ? 'published' : 'draft',
        hasUnpublishedChanges:
          JSON.stringify(template.content) !==
          JSON.stringify(template.publishedContent),
        content: loopTemplatesService.normalize(template.content),
      }}
      previewItems={preview.items}
      loopItemFields={preview.fields}
      themeTokens={settings.themeTokens}
    />
  );
}
