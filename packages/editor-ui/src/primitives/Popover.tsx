import * as PopoverPrimitive from '@radix-ui/react-popover';
import type React from 'react';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { useLayerScope } from '../theme/EditorUIProvider';

/**
 * Popover on Radix (B15 E2b): focus moves in and returns to the trigger,
 * Escape and outside clicks close it, it flips to stay on screen, and it
 * grows out of its side. Same props as before.
 */
export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  className?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  content,
  align = 'center',
  side = 'bottom',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const layer = useLayerScope();
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        {/* A span keeps any trigger (even a non-button) focusable and clickable. */}
        <span className="inline-flex cursor-pointer">{trigger}</span>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={8}
          {...layer}
          className={cn(
            layer.className,
            'ne-motion-pop z-50 min-w-[200px] rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-3 text-[var(--ne-text)] shadow-lg focus:outline-none',
            className
          )}
        >
          {typeof content === 'function'
            ? content(() => setOpen(false))
            : content}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
