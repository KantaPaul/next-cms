import { editorSetup } from '@/builder/definitions';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import {
  BLOCK_EDITOR_TYPES,
  defaultHiddenBlocks,
  hiddenBlocksFor,
} from '@/config/block-manager';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { SettingsNav } from '../_components/settings-nav';
import {
  BlockManager,
  type BlockManagerEditor,
} from './_components/block-manager';

const TITLE = 'Block manager';

export const metadata = { ...metaObject(TITLE) };

export default async function BlockManagerPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
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
  const editors: BlockManagerEditor[] = BLOCK_EDITOR_TYPES.map(({ kind, label }) => {
    const setup = editorSetup(kind);
    const groups = setup.groups.map(group => ({
      title: group.title,
      blocks: group.types.map(type => ({
        type,
        label: setup.definitions[type]?.label ?? type,
      })),
    }));
    const available = groups.flatMap(g => g.blocks.map(b => b.type));
    return {
      kind,
      label,
      groups,
      hidden: hiddenBlocksFor(settings.blockSettings, kind, available),
      defaultHidden: defaultHiddenBlocks(kind, available),
      customized: Array.isArray(settings.blockSettings.hidden[kind]),
    };
  });

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <SettingsNav />
      <BlockManager editors={editors} />
    </>
  );
}
