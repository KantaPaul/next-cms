import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import type React from 'react';
import { cn } from '../lib/cn';
import {
  MenuItemBody,
  menuContentClass,
  menuItemClass,
} from '../primitives/Menu';
import { useReturnFocus } from '../lib/useReturnFocus';
import { useLayerScope } from '../theme/EditorUIProvider';

/**
 * Context menu opened by the host at a point (B15 E2b). Built on Radix's
 * dropdown menu anchored to an invisible point at (x, y), so a builder can
 * open it from a canvas right-click or a keyboard shortcut alike. Arrow keys,
 * typeahead, Escape and focus return come from Radix. Same props as before.
 */
export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  open: boolean;
  onClose: () => void;
  actions: ContextMenuAction[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  open,
  onClose,
  actions,
}) => {
  const layer = useLayerScope();
  const returnFocus = useReturnFocus(open);
  return (
    <MenuPrimitive.Root
      open={open}
      onOpenChange={next => !next && onClose()}
      modal={false}
    >
      <MenuPrimitive.Trigger asChild>
        <span
          aria-hidden
          style={{
            position: 'fixed',
            top: y,
            left: x,
            width: 0,
            height: 0,
            pointerEvents: 'none',
          }}
        />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align="start"
          side="bottom"
          sideOffset={2}
          collisionPadding={8}
          {...layer}
          onCloseAutoFocus={returnFocus}
          className={cn(
            layer.className,
            menuContentClass,
            'min-w-[190px] shadow-xl'
          )}
        >
          {actions.map(act => (
            <MenuPrimitive.Item
              key={act.id}
              disabled={act.disabled}
              onSelect={() => act.onClick()}
              className={menuItemClass(act.danger)}
            >
              <MenuItemBody
                icon={act.icon}
                label={act.label}
                shortcut={act.shortcut}
              />
            </MenuPrimitive.Item>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
};
