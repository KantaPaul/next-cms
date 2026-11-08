/**
 * Quick insert (R713 / UXE-03): a small searchable popover for placing one
 * block at a specific position — opened from the "+" shown between blocks on
 * hover, or by pressing "/" anywhere the page itself is focused (not inside a
 * field or inline text edit).
 */

import {
  findPosition,
  ROOT_SLOT,
  type SlotPosition,
  type SlotRef,
} from '@nextcms/builder-core';
import { CommandPopover, type CommandPaletteItem } from '@nextcms/editor-ui';
import { useEffect, useMemo, useState } from 'react';
import type { BlockGroup } from './block-list';
import { useEditor, useEditorStore } from './context';
import type { EditorStore } from './store';

export type QuickInsertTarget = {
  /** Screen point to anchor the popover near (the `+` button, or the caret). */
  point: { x: number; y: number };
  /** Where the chosen block goes; omit to use the editor's default position. */
  position?: SlotPosition;
};

/** Resolves the slot where Quick Insert will place a block. */
export function resolveQuickInsertSlot(
  store: EditorStore,
  position?: SlotPosition
): SlotRef {
  if (position) {
    return { parentId: position.parentId, slot: position.slot };
  }
  const state = store.getState();
  const selected = state.selection[0];
  const found = selected ? findPosition(state.doc, selected) : null;
  if (found) {
    return { parentId: found.parentId, slot: found.slot };
  }
  return { parentId: null, slot: ROOT_SLOT };
}

/** Filters block groups to types allowed in `targetSlot`, offering `Column` when targeting a `columns` slot. */
export function quickInsertItemsForSlot(
  store: EditorStore,
  groups?: BlockGroup[],
  position?: SlotPosition
): { id: string; label: string; group: string }[] {
  const slot = resolveQuickInsertSlot(store, position);
  const effectiveGroups: BlockGroup[] =
    groups && groups.length > 0
      ? groups
      : [{ title: 'Blocks', types: Object.keys(store.schemas) }];
  const seen = new Set<string>();
  const items = effectiveGroups.flatMap(group =>
    group.types
      .filter(
        type =>
          !seen.has(type) &&
          store.canPlace(type, slot) &&
          seen.add(type)
      )
      .map(type => ({
        id: type,
        label: store.schemas[type]?.label ?? type,
        group: group.title,
      }))
  );
  if (
    !seen.has('Column') &&
    store.schemas.Column &&
    store.canPlace('Column', slot)
  ) {
    items.push({
      id: 'Column',
      label: store.schemas.Column.label ?? 'Column',
      group: 'Layout',
    });
  }
  return items;
}

export function QuickInsertPopover({
  target,
  onClose,
  groups,
}: {
  target: QuickInsertTarget | null;
  onClose: () => void;
  groups?: BlockGroup[];
}) {
  const store = useEditorStore();
  const doc = useEditor(state => state.doc);
  const selection = useEditor(state => state.selection);
  // Client only: server-rendered, Radix's generated ids would not match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Freeze the target so the popover keeps its place while it animates out.
  const [shown, setShown] = useState<QuickInsertTarget | null>(null);
  useEffect(() => {
    if (target) setShown(target);
  }, [target]);

  const items = useMemo<CommandPaletteItem[]>(() => {
    return quickInsertItemsForSlot(store, groups, shown?.position).map(
      entry => ({
        ...entry,
        onSelect: () => {
          store.insertBlock(entry.id, shown?.position);
        },
      })
    );
  }, [groups, store, shown, doc, selection]);

  if (!mounted) return null;
  return (
    <CommandPopover
      open={!!target}
      onOpenChange={open => {
        if (!open) onClose();
      }}
      x={shown?.point.x ?? 0}
      y={shown?.point.y ?? 0}
      items={items}
      label="Insert a block"
      placeholder="Insert a block…"
    />
  );
}
