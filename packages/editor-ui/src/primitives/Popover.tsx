import * as React from 'react';
import * as PopoverPrimitives from '@radix-ui/react-popover';
import { cn } from '../lib/cn';

const Popover = PopoverPrimitives.Root;
const PopoverTrigger = PopoverPrimitives.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitives.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitives.Portal>
    <PopoverPrimitives.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-4 text-[var(--ne-text)] shadow-md outline-none animate-in fade-in-0 zoom-in-95',
        className
      )}
      {...props}
    />
  </PopoverPrimitives.Portal>
));
PopoverContent.displayName = PopoverPrimitives.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };