import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type React from 'react';
import { cn } from '../lib/cn';
import { useLayerScope } from '../theme/EditorUIProvider';

/**
 * Tooltip on Radix (B15 E2b): shows on hover and keyboard focus, flips to
 * stay on screen, and grows out of its side. Same props as before.
 */
export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  shortcut?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  shortcut,
}) => {
  const layer = useLayerScope();
  if (!content) return <>{children}</>;
  return (
    <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            {...layer}
            className={cn(
              layer.className,
              'ne-motion-pop z-50 flex select-none items-center gap-1.5 whitespace-nowrap rounded-[var(--ne-radius-sm)] border border-slate-700/50 bg-slate-900 px-2 py-1 text-[11px] leading-tight text-white shadow-md'
            )}
          >
            <span>{content}</span>
            {shortcut && (
              <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] text-slate-300">
                {shortcut}
              </kbd>
            )}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};
