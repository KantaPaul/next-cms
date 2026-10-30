/**
 * Quick insert (R713 / UXE-03): a small searchable popover for placing one
 * block at a specific position — opened from the "+" shown between blocks on
 * hover, or by pressing "/" anywhere the page itself is focused (not inside a
 * field or inline text edit).
 */

import type { SlotPosition } from '@nextcms/builder-core';
import { CommandPopover, type CommandPaletteItem } from '@nextcms/editor-ui';
import { useEffect, useMemo, useState } from 'react';
import type { BlockGroup } from './block-list';
import { useEditorStore } from './context';

export type QuickInsertTarget = {
  /** Screen point to anchor the popover near (the `+` button, or the caret). */
  point: { x: number; y: number };
  /** Where the chosen block goes; omit to use the editor's default position. */
  position?: SlotPosition;
};

export function QuickInsertPopover({
  target,
  onClose,
  groups,
}: {
  target: QuickInsertTarget | null;
  onClose: () => void;
  groups: BlockGroup[];
}) {
  const store = useEditorStore();
  // Client only: server-rendered, Radix's generated ids would not match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Freeze the target so the popover keeps its place while it animates out.
  const [shown, setShown] = useState<QuickInsertTarget | null>(null);
  useEffect(() => {
    if (target) setShown(target);
  }, [target]);

  const items = useMemo<CommandPaletteItem[]>(() => {
    const seen = new Set<string>();
    return groups.flatMap(group =>
      group.types
        .filter(type => !seen.has(type) && seen.add(type))
        .map(type => ({
          id: type,
          label: store.schemas[type]?.label ?? type,
          group: group.title,
          onSelect: () => {
            store.insertBlock(type, shown?.position);
          },
        }))
    );
  }, [groups, store, shown]);

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
