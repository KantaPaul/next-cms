import 'server-only';
import { editorSetup } from '@/builder/definitions';
import {
  type BlockEditorGroup,
  type BlockEditorKind,
  blockSetupKind,
  type BlockSettings,
  type CollectionBlockEditorKind,
  type CollectionBlockSettings,
  defaultHiddenBlocks,
  hiddenBlocksFor,
} from '@/config/block-manager';
import type { BlockManagerEditor } from './_components/block-manager';

/**
 * Builds the BlockManager editor definitions from `editorSetup(kind)` and
 * resolves active/default hidden lists for either site-wide or collection settings.
 */
export function buildBlockManagerEditors(
  editorTypes: readonly { kind: BlockEditorKind; label: string; group?: BlockEditorGroup }[],
  siteBlockSettings: BlockSettings,
  collectionBlockSettings?: CollectionBlockSettings | null
): BlockManagerEditor[] {
  return editorTypes.map(({ kind, label, group: section }) => {
    const setup = editorSetup(blockSetupKind(kind));
    const seen = new Set<string>();
    const groups = setup.groups
      .map(group => {
        const blocks: { type: string; label: string }[] = [];
        for (const type of group.types) {
          if (seen.has(type) || !setup.schemas[type]) continue;
          seen.add(type);
          blocks.push({
            type,
            label:
              setup.definitions[type]?.label ??
              setup.schemas[type]?.label ??
              type,
          });
        }
        return { title: group.title, blocks };
      })
      .filter(group => group.blocks.length > 0);

    // Mirror ElementsView: schemas not placed in any category sit under "Other".
    const otherBlocks: { type: string; label: string }[] = [];
    for (const type of Object.keys(setup.schemas)) {
      if (seen.has(type)) continue;
      seen.add(type);
      otherBlocks.push({
        type,
        label:
          setup.definitions[type]?.label ??
          setup.schemas[type]?.label ??
          type,
      });
    }
    if (otherBlocks.length > 0) {
      groups.push({ title: 'Other', blocks: otherBlocks });
    }

    const available = groups.flatMap(g => g.blocks.map(b => b.type));
    const siteHidden = hiddenBlocksFor(siteBlockSettings, kind, available);

    if (collectionBlockSettings) {
      const colKind = kind as CollectionBlockEditorKind;
      return {
        kind,
        label,
        ...(section ? { section } : {}),
        groups,
        hidden: hiddenBlocksFor(
          siteBlockSettings,
          kind,
          available,
          collectionBlockSettings
        ),
        defaultHidden: siteHidden,
        customized: Array.isArray(collectionBlockSettings.hidden[colKind]),
      };
    }

    return {
      kind,
      label,
      ...(section ? { section } : {}),
      groups,
      hidden: siteHidden,
      defaultHidden: defaultHiddenBlocks(kind, available),
      customized: Array.isArray(siteBlockSettings.hidden[kind]),
    };
  });
}
