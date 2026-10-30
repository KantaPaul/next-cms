/**
 * The insert panel (R714 / UXE-04): search, categories, click to insert after
 * the selection, or drag to place anywhere. Renders through editor-ui's
 * LibraryPanel (B15 E4); the pointer drag controller still decides between a
 * click and a drag, so the canvas drop logic is unchanged.
 */

import {
  Chip,
  ChipList,
  type LibraryItemDef,
  LibraryPanel,
} from '@nextcms/editor-ui';
import { useMemo } from 'react';
import { useEditorStore } from './context';
import type { DragController } from './drag';

export type BlockGroup = { title: string; types: string[] };

/** One library item per block type, in group order; a type listed twice keeps its first group. */
export function libraryItems(
  groups: BlockGroup[],
  labelOf: (type: string) => string
): LibraryItemDef[] {
  const seen = new Set<string>();
  const items: LibraryItemDef[] = [];
  for (const group of groups) {
    for (const type of group.types) {
      if (seen.has(type)) continue;
      seen.add(type);
      items.push({ type, label: labelOf(type), category: group.title });
    }
  }
  return items;
}

export function BlockList({
  groups,
  drag,
}: {
  groups: BlockGroup[];
  drag: DragController;
}) {
  const store = useEditorStore();
  const items = useMemo(
    () => libraryItems(groups, type => store.schemas[type]?.label ?? type),
    [groups, store]
  );

  return (
    <LibraryPanel
      items={items}
      searchPlaceholder="Search blocks…"
      itemHint="Click to add, or drag onto the page"
      footer={null}
      onSelectItem={item => store.insertBlock(item.type)}
      onItemPointerDown={(item, event) =>
        drag.start({ kind: 'new', type: item.type }, event, () =>
          store.insertBlock(item.type)
        )
      }
      renderItemExtra={item => {
        const presets = store.schemas[item.type]?.presets;
        const names = presets ? Object.keys(presets) : [];
        if (!names.length) return null;
        return (
          <ChipList label={`${item.label} presets`}>
            {names.map(name => (
              <li key={name}>
                <Chip
                  title={`Add the ${name} preset`}
                  onClick={() =>
                    store.insertBlock(item.type, undefined, presets?.[name])
                  }
                >
                  {name}
                </Chip>
              </li>
            ))}
          </ChipList>
        );
      }}
    />
  );
}
