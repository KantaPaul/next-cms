import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import type React from 'react';
import { Kbd } from '../primitives/Kbd';
import { useEditorUI } from '../theme/EditorUIProvider';

/**
 * Command palette markup (B15 E3, R712): cmdk's list inside a Radix dialog,
 * so focus is trapped while open and returns to the trigger on close. It
 * owns no open state and no shortcut; the builder passes both in, so there
 * is only ever one palette and one Cmd+K listener. The dialog is portalled
 * to <body>, so it re-applies the editor's theme and direction itself.
 */
export interface CommandPaletteItem {
  id: string;
  label: string;
  group?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  /** Extra words that should match this item in search. */
  keywords?: string[];
  disabled?: boolean;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  placeholder?: string;
  emptyLabel?: string;
}

function groupItems(items: CommandPaletteItem[]) {
  const groups = new Map<string, CommandPaletteItem[]>();
  for (const item of items) {
    const key = item.group ?? '';
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  items,
  placeholder = 'Type a command or search actions…',
  emptyLabel = 'No matching commands',
}) => {
  const { theme, dir } = useEditorUI();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ne-ui fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs" />
        <DialogPrimitive.Content
          data-ne-theme={theme}
          dir={dir}
          aria-describedby={undefined}
          className="ne-ui fixed left-1/2 top-20 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] font-[family-name:var(--ne-font-ui)] text-[13px] text-[var(--ne-text)] shadow-2xl focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            Command palette
          </DialogPrimitive.Title>
          <Command label="Command palette">
            <div className="flex h-11 items-center gap-2 border-b border-[var(--ne-border)] px-3">
              <Search
                aria-hidden
                className="h-4 w-4 shrink-0 text-[var(--ne-text-muted)]"
              />
              <Command.Input
                placeholder={placeholder}
                className="w-full border-0 bg-transparent p-0 text-xs text-[var(--ne-text)] shadow-none placeholder:text-[var(--ne-text-subtle)] focus:shadow-none focus:ring-0 focus:outline-none"
              />
              <Kbd>ESC</Kbd>
            </div>

            <Command.List className="ne-scrollbar max-h-72 overflow-y-auto p-1.5">
              <Command.Empty className="py-6 text-center text-xs text-[var(--ne-text-muted)]">
                {emptyLabel}
              </Command.Empty>
              {groupItems(items).map(([group, groupItems]) => (
                <Command.Group
                  key={group || 'ungrouped'}
                  heading={group || undefined}
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--ne-text-subtle)]"
                >
                  {groupItems.map(item => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.id}`}
                      keywords={item.keywords}
                      disabled={item.disabled}
                      onSelect={() => {
                        item.onSelect();
                        onOpenChange(false);
                      }}
                      className="group flex cursor-pointer items-center justify-between gap-3 rounded-[var(--ne-radius-sm)] px-2.5 py-1.5 text-xs text-[var(--ne-text)] data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 data-[selected=true]:bg-[var(--ne-primary)] data-[selected=true]:text-white"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {item.icon && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--ne-text-muted)] group-data-[selected=true]:text-white">
                            {item.icon}
                          </span>
                        )}
                        <span className="truncate font-medium">
                          {item.label}
                        </span>
                      </span>
                      {item.shortcut && (
                        <span className="shrink-0 font-mono text-[10px] tracking-wider text-[var(--ne-text-muted)] group-data-[selected=true]:text-white/80">
                          {item.shortcut}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>

            <div className="flex items-center justify-between border-t border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] px-3 py-1.5 text-[10px] text-[var(--ne-text-muted)]">
              <span>
                Navigate with <Kbd>↑</Kbd> <Kbd>↓</Kbd>
              </span>
              <span>
                Select with <Kbd>↵</Kbd>
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
