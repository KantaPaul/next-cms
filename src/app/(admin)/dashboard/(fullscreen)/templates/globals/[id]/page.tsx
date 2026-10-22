import { notFound, redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { templatesService } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.service';
import { GlobalBlockLoader } from './global-block-loader';

export const metadata = metaObject('Edit global block');

export default async function GlobalBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  if (!allowed) redirect(PAGES.DASHBOARD.TEMPLATES);

  const [block, settings] = await Promise.all([templatesService.getGlobalBlock(id), siteSettingsService.get()]);
  if (!block) notFound();

  return (
    <GlobalBlockLoader
      block={{ id: block.id, name: block.name, category: block.category, content: block.content as any }}
      themeTokens={settings.themeTokens}
    />
  );
}
