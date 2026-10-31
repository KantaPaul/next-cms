import React from 'react';
import { Dialog } from '../primitives/Dialog';
import { Kbd } from '../primitives/Kbd';

export interface ShortcutHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

type ShortcutGroup = {
  category: string;
  items: { label: string; keys: string[] }[];
};

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'General & Actions',
    items: [
      { label: 'Save', keys: ['⌘', 'S'] },
      { label: 'Undo', keys: ['⌘', 'Z'] },
      { label: 'Redo', keys: ['⌘', '⇧', 'Z'] },
      { label: 'Command palette', keys: ['⌘', 'K'] },
      { label: 'Keyboard shortcuts', keys: ['?'] },
    ],
  },
  {
    category: 'Canvas & Selection',
    items: [
      { label: 'Select parent block', keys: ['⇧', 'Enter'] },
      { label: 'Select child block', keys: ['Enter'] },
      { label: 'Select previous block', keys: ['↑'] },
      { label: 'Select next block', keys: ['↓'] },
      { label: 'Deselect block', keys: ['Esc'] },
    ],
  },
  {
    category: 'Editing & Organization',
    items: [
      { label: 'Duplicate block', keys: ['⌘', 'D'] },
      { label: 'Copy block', keys: ['⌘', 'C'] },
      { label: 'Cut block', keys: ['⌘', 'X'] },
      { label: 'Paste block', keys: ['⌘', 'V'] },
      { label: 'Delete block', keys: ['Del'] },
      { label: 'Move block up', keys: ['⌥', '↑'] },
      { label: 'Move block down', keys: ['⌥', '↓'] },
    ],
  },
];

export const ShortcutHelpDialog: React.FC<ShortcutHelpDialogProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard Shortcuts"
      description="Quick navigation and editing shortcuts in the visual builder."
      maxWidth="md"
    >
      <div className="space-y-4 py-1">
        {SHORTCUT_GROUPS.map(group => (
          <div key={group.category} className="space-y-1.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
              {group.category}
            </h4>
            <div className="divide-y divide-[var(--ne-border)] rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] text-xs">
              {group.items.map(item => (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3 py-1.5"
                >
                  <span className="text-[var(--ne-text)]">{item.label}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map(k => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
};
