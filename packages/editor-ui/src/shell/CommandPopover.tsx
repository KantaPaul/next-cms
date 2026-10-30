import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import type React from 'react';
import { cn } from '../lib/cn';
import { useReturnFocus } from '../lib/useReturnFocus';
import { useLayerScope } from '../theme/EditorUIProvider';
import type { CommandPaletteItem } from './CommandPalette';

/**
 * A small searchable list anchored at a screen point (B15 E6): quick insert,
 * "replace with", and similar pickers. cmdk inside a Radix popover, so it
 * filters as you type, moves with arrows, selects with Enter, closes with
 * Escape and returns focus. `modal` blocks the rest of the page while open,
 * so a click anywhere (even inside an iframe) closes it.
 */
export interface CommandPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Screen point to open next to. */
  x: number;
  y: number;
  items: CommandPaletteItem[];
  label: string;
  placeholder?: string;
  emptyLabel?: string;
  modal?: boolean;
}

export const CommandPopover: React.FC<CommandPopoverProps> = ({
  open,
  onOpenChange,
  x,
  y,
  items,
  label,
  placeholder = 'Search…',
  emptyLabel = 'No matches.',
  modal = true,
}) => {
  const layer = useLayerScope();
  const returnFocus = useReturnFocus(open);
  // Keep the anchor inside the window: a point from an overflowing canvas can
  // be off-screen, and a popover tied to it would follow it there.
  const clampX =
    typeof window === 'undefined'
      ? x
      : Math.min(Math.max(8, x), window.innerWidth - 8);
  const clampY =
    typeof window === 'undefined'
      ? y
      : Math.min(Math.max(8, y), window.innerHeight - 8);
  const groups = new Map<string, CommandPaletteItem[]>();
  for (const item of items) {
    const key = item.group ?? '';
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      modal={modal}
    >
      <PopoverPrimitive.Anchor asChild>
        <span
          aria-hidden
          style={{
            position: 'fixed',
            top: clampY,
            left: clampX,
            width: 0,
            height: 0,
            pointerEvents: 'none',
          }}
        />
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          side="bottom"
          sideOffset={4}
          collisionPadding={8}
          // Stay on screen even when the anchor point is not.
          sticky="always"
          {...layer}
          aria-label={label}
          onCloseAutoFocus={returnFocus}
          className={cn(
            layer.className,
            'ne-motion-pop z-50 w-60 overflow-hidden rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] text-[13px] text-[var(--ne-text)] shadow-xl focus:outline-none'
          )}
        >
          <Command label={label}>
            <div className="flex h-9 items-center gap-2 border-b border-[var(--ne-border)] px-2.5">
              <Search
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-[var(--ne-text-muted)]"
              />
              <Command.Input
                placeholder={placeholder}
                className="w-full border-0 bg-transparent p-0 text-xs text-[var(--ne-text)] shadow-none placeholder:text-[var(--ne-text-subtle)] focus:shadow-none focus:outline-none focus:ring-0"
              />
            </div>
            <Command.List className="ne-scrollbar max-h-64 overflow-y-auto p-1">
              <Command.Empty className="px-2 py-3 text-center text-xs text-[var(--ne-text-muted)]">
                {emptyLabel}
              </Command.Empty>
              {[...groups.entries()].map(([group, list]) => (
                <Command.Group
                  key={group || 'ungrouped'}
                  heading={group || undefined}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--ne-text-subtle)]"
                >
                  {list.map(item => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.id}`}
                      keywords={item.keywords}
                      disabled={item.disabled}
                      onSelect={() => {
                        item.onSelect();
                        onOpenChange(false);
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-[var(--ne-radius-sm)] px-2 py-1.5 text-xs text-[var(--ne-text)] data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 data-[selected=true]:bg-[var(--ne-primary)] data-[selected=true]:text-white"
                    >
                      {item.icon && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                          {item.icon}
                        </span>
                      )}
                      <span className="truncate">{item.label}</span>
                      {item.shortcut && (
                        <span className="ms-auto font-mono text-[10px] opacity-70">
                          {item.shortcut}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
