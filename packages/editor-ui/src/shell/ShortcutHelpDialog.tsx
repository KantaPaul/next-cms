import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog } from '../primitives/Dialog';
import { Input } from '../primitives/Input';
import { Kbd } from '../primitives/Kbd';

export interface ShortcutHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export type ShortcutGroup = {
  category: string;
  items: { label: string; keys: string[] }[];
};

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'General & Actions',
    items: [
      { label: 'Save document', keys: ['⌘', 'S'] },
      { label: 'Undo change', keys: ['⌘', 'Z'] },
      { label: 'Redo change', keys: ['⌘', '⇧', 'Z'] },
      { label: 'Command palette', keys: ['⌘', 'K'] },
      { label: 'Animation view', keys: ['⌥', 'T'] },
      { label: 'Keyboard shortcuts help', keys: ['?'] },
    ],
  },
  {
    category: 'Canvas & Selection',
    items: [
      { label: 'Select parent block', keys: ['⇧', 'Enter'] },
      { label: 'Select child / Move mode', keys: ['Enter'] },
      { label: 'Select previous block', keys: ['↑'] },
      { label: 'Select next block', keys: ['↓'] },
      { label: 'Deselect block', keys: ['Esc'] },
      { label: 'Inspect block', keys: ['⌥', 'I'] },
    ],
  },
  {
    category: 'Editing & Organization',
    items: [
      { label: 'Duplicate block', keys: ['⌘', 'D'] },
      { label: 'Copy block', keys: ['⌘', 'C'] },
      { label: 'Cut block', keys: ['⌘', 'X'] },
      { label: 'Paste block', keys: ['⌘', 'V'] },
      { label: 'Copy style', keys: ['⌥', '⌘', 'C'] },
      { label: 'Paste style', keys: ['⌥', '⌘', 'V'] },
      { label: 'Delete block', keys: ['Del'] },
      { label: 'Move block up', keys: ['⌥', '↑'] },
      { label: 'Move block down', keys: ['⌥', '↓'] },
    ],
  },
];

export function filterShortcutGroups(
  groups: ShortcutGroup[],
  query: string
): ShortcutGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;

  return groups
    .map(group => {
      const categoryMatch = group.category.toLowerCase().includes(q);
      const items = group.items.filter(
        item =>
          categoryMatch ||
          item.label.toLowerCase().includes(q) ||
          item.keys.some(k => k.toLowerCase().includes(q))
      );
      return { ...group, items };
    })
    .filter(group => group.items.length > 0);
}

export const ShortcutHelpDialog: React.FC<ShortcutHelpDialogProps> = ({
  open,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(
    () => filterShortcutGroups(SHORTCUT_GROUPS, query),
    [query]
  );

  return (
    <Dialog
      open={open}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      title="Keyboard Shortcuts"
      description="Quick navigation and editing shortcuts in the visual builder."
      maxWidth="md"
    >
      <div className="space-y-4 py-1">
        {/* Search filter input */}
        <div className="relative">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search shortcuts..."
            aria-label="Search shortcuts"
            className="pl-8 text-xs"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ne-text-muted)] pointer-events-none" />
        </div>

        {/* Categories and shortcuts list */}
        {filteredGroups.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--ne-text-muted)]">
            No shortcuts matching &ldquo;{query}&rdquo;
          </div>
        ) : (
          <div className="space-y-4 max-h-[360px] overflow-y-auto ne-scrollbar pr-1">
            {filteredGroups.map(group => (
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
        )}
      </div>
    </Dialog>
  );
};
