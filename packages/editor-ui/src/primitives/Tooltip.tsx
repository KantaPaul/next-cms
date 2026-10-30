import * as React from 'react';
import * as TooltipPrimitives from '@radix-ui/react-tooltip';
import { cn } from '../lib/cn';

const TooltipProvider = TooltipPrimitives.Provider;
const Tooltip = TooltipPrimitives.Root;
const TooltipTrigger = TooltipPrimitives.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitives.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitives.Portal>
    <TooltipPrimitives.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-surface)] px-2.5 py-1.5 text-xs text-[var(--ne-text)] shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        className
      )}
      {...props}
    />
  </TooltipPrimitives.Portal>
));
TooltipContent.displayName = TooltipPrimitives.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };