import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import type React from 'react';
import { cn } from '../lib/cn';
import { useLayerScope } from '../theme/EditorUIProvider';

/**
 * Dropdown menu on Radix (B15 E2b): arrow keys, Home/End and typeahead move
 * between items, Escape closes and returns focus, and it grows out of its
 * trigger. Same props as before.
 */
export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export interface MenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
}

/** Shared item look for Menu and ContextMenu. */
export const menuContentClass =
  'ne-motion-pop z-50 min-w-[180px] rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-1 text-[var(--ne-text)] shadow-lg focus:outline-none';

export function menuItemClass(danger?: boolean) {
  return cn(
    'flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-[var(--ne-radius-sm)] px-2.5 py-1.5 text-xs outline-none transition-colors data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
    danger
      ? 'text-[var(--ne-danger)] data-[highlighted]:bg-[var(--ne-danger-soft)]'
      : 'text-[var(--ne-text)] data-[highlighted]:bg-[var(--ne-surface-hover)]'
  );
}

export function MenuItemBody({
  icon,
  label,
  shortcut,
}: Pick<MenuItem, 'icon' | 'label' | 'shortcut'>) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-2">
        {icon && (
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[var(--ne-text-muted)]">
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
      </span>
      {shortcut && (
        <span className="font-mono text-[10px] tracking-wider text-[var(--ne-text-muted)]">
          {shortcut}
        </span>
      )}
    </>
  );
}

export const Menu: React.FC<MenuProps> = ({
  trigger,
  items,
  align = 'start',
}) => {
  const layer = useLayerScope();
  return (
    <MenuPrimitive.Root modal={false}>
      <MenuPrimitive.Trigger asChild>
        <span className="inline-flex cursor-pointer">{trigger}</span>
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align={align}
          sideOffset={4}
          collisionPadding={8}
          {...layer}
          className={cn(layer.className, menuContentClass)}
        >
          {items.map(item =>
            item.divider ? (
              <MenuPrimitive.Separator
                key={item.id}
                className="my-1 h-px bg-[var(--ne-border)]"
              />
            ) : (
              <MenuPrimitive.Item
                key={item.id}
                disabled={item.disabled}
                onSelect={() => item.onClick?.()}
                className={menuItemClass(item.danger)}
              >
                <MenuItemBody
                  icon={item.icon}
                  label={item.label}
                  shortcut={item.shortcut}
                />
              </MenuPrimitive.Item>
            )
          )}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
};
