/**
 * Right-click menu on a selected block (R720 / UXE-10): the same actions as
 * the floating toolbar, plus copy, cut, and paste, each with its shortcut.
 */

import { ContextMenu as ContextMenuView } from '@nextcms/editor-ui';

export type ContextMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  /** Draws a separator above this item. */
  separator?: boolean;
  run: () => void;
};

export type ContextMenuTarget = {
  x: number;
  y: number;
  items: ContextMenuItem[];
};

export function ContextMenu({
  target,
  onClose,
}: {
  target: ContextMenuTarget | null;
  onClose: () => void;
}) {
  // editor-ui's menu (Radix): arrow keys, typeahead, Escape and focus return.
  // Modal, so a click anywhere (including inside the canvas iframe) closes it.
  return (
    <ContextMenuView
      open={!!target}
      x={target?.x ?? 0}
      y={target?.y ?? 0}
      onClose={onClose}
      modal
      label="Block actions"
      actions={(target?.items ?? []).map(item => ({
        id: item.id,
        label: item.label,
        shortcut: item.shortcut,
        disabled: item.disabled,
        separator: item.separator,
        onClick: item.run,
      }))}
    />
  );
}
