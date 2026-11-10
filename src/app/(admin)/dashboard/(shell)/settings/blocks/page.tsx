import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { BLOCK_EDITOR_TYPES } from '@/config/block-manager';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { SettingsNav } from '../_components/settings-nav';
import { BlockManager } from './_components/block-manager';
import { buildBlockManagerEditors } from './editors';

const TITLE = 'Block manager';

export const metadata = { ...metaObject(TITLE) };

export default async function BlockManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ editor?: string; kind?: string }>;
}) {
  const [{ allowed }, query] = await Promise.all([
    requirePermission(PERMISSIONS.SETTINGS_MANAGE),
    searchParams,
  ]);
  const initialEditor = query.editor ?? query.kind;
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Settings', href: PAGES.DASHBOARD.SETTINGS },
    { title: 'Blocks', href: PAGES.DASHBOARD.SETTINGS_BLOCKS },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="block settings" />
      </>
    );
  }

  const settings = await siteSettingsService.get();

  // Each editor type offers its own set of blocks (e.g. Header blocks only in
  // the header editor), grouped as in the editor's insert panel.
  const editors = buildBlockManagerEditors(
    BLOCK_EDITOR_TYPES,
    settings.blockSettings
  );

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <SettingsNav />
      <BlockManager editors={editors} initialEditor={initialEditor} />
    </>
  );
}
