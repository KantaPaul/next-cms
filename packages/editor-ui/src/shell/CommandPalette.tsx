import * as React from 'react';
import { Command } from 'cmdk';
import { cn } from '../lib/cn';

export interface CommandPaletteItem {
  id: string;
  label: string;
  shortcut?: string;
  onSelect?: () => void;
  group?: string;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  placeholder?: string;
  className?: string;
}

export function CommandPalette({ open, onOpenChange, items, placeholder = 'Type a command or search…', className }: CommandPaletteProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const groups = new Map<string, CommandPaletteItem[]>();
  for (const item of items) {
    const group = item.group ?? 'Actions';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(item);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} aria-hidden />
      <Command
        className={cn(
          'relative w-full max-w-lg overflow-hidden rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] shadow-lg',
          className
        )}
      >
        <Command.Input
          placeholder={placeholder}
          className="w-full border-b border-[var(--ne-border)] bg-transparent px-4 py-3 text-sm text-[var(--ne-text)] outline-none placeholder:text-[var(--ne-text-muted)]"
        />
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-[var(--ne-text-muted)]">
            No results found.
          </Command.Empty>
          {Array.from(groups.entries()).map(([group, items]) => (
            <Command.Group key={group} heading={group} className="mb-2 px-2 text-xs font-medium text-[var(--ne-text-muted)]">
              {items.map(item => (
                <Command.Item
                  key={item.id}
                  value={item.label}
                  onSelect={() => {
                    item.onSelect?.();
                    onOpenChange(false);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-[var(--ne-radius-sm)] px-2 py-1.5 text-sm text-[var(--ne-text)] aria-selected:bg-[var(--ne-bg)]"
                >
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <kbd className="ml-auto text-xs text-[var(--ne-text-muted)]">{item.shortcut}</kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}