import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronRight } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { cn } from '../lib/cn';

/**
 * A titled, collapsible group of fields on Radix Collapsible (B15 E2b): the
 * content animates open and closed, the header is a real button with
 * aria-expanded. Same props as before.
 */
export interface FieldGroupProps {
  title: string;
  defaultExpanded?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
  title,
  defaultExpanded = true,
  action,
  children,
  className,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <Collapsible.Root
      open={expanded}
      onOpenChange={setExpanded}
      className={cn(
        'border-b border-[var(--ne-border)] py-2.5 last:border-b-0',
        className
      )}
    >
      <div className="mb-1.5 flex select-none items-center justify-between">
        <Collapsible.Trigger className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--ne-text)] transition-colors hover:text-[var(--ne-primary)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]">
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 text-[var(--ne-text-muted)] transition-transform duration-[var(--ne-duration-fast)]',
              expanded ? 'rotate-90' : 'rtl:-scale-x-100'
            )}
          />
          <span>{title}</span>
        </Collapsible.Trigger>
        {action && <div>{action}</div>}
      </div>
      <Collapsible.Content className="ne-motion-collapse">
        <div className="space-y-1 pe-1 ps-5">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
