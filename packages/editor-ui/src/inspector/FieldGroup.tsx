import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { cn } from '../lib/cn';

/**
 * A titled, collapsible group of fields on Radix Collapsible (B15 E2b): the
 * content animates open and closed, the header is a real button with
 * aria-expanded. `changedCount` / `modified` add the section's modified dot
 * and count badge (the inspector's SectionAccordion).
 */
export interface FieldGroupProps {
  title: string;
  defaultExpanded?: boolean;
  /** Controlled open state; pair with onExpandedChange. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Number of fields in the group that differ from their defaults. */
  changedCount?: number;
  /** Shows the modified dot even without a count. */
  modified?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
  title,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onExpandedChange,
  changedCount = 0,
  modified,
  action,
  children,
  className,
}) => {
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    useState(defaultExpanded);
  const expanded = controlledExpanded ?? uncontrolledExpanded;
  const setExpanded = (next: boolean) => {
    if (controlledExpanded === undefined) setUncontrolledExpanded(next);
    onExpandedChange?.(next);
  };
  const hasChanges = changedCount > 0 || !!modified;
  return (
    <Collapsible.Root
      open={expanded}
      onOpenChange={setExpanded}
      className={cn(
        'border-b border-[var(--ne-border)] py-2.5 last:border-b-0',
        className
      )}
    >
      <div className="mb-1.5 flex select-none items-center justify-between gap-2">
        <Collapsible.Trigger className="flex min-w-0 cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--ne-text)] transition-colors hover:text-[var(--ne-primary)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]">
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-[var(--ne-text-muted)] transition-transform duration-[var(--ne-duration-fast)]',
              expanded ? 'rotate-90' : 'rtl:-scale-x-100'
            )}
          />
          <span className="truncate">{title}</span>
          {hasChanges && (
            <span
              data-modified-dot=""
              title="Contains modified values"
              aria-label="Modified section"
              className="ne-motion-pop-in inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ne-primary)]"
            />
          )}
        </Collapsible.Trigger>
        <div className="flex shrink-0 items-center gap-1.5">
          {changedCount > 0 && (
            <span
              title={`${changedCount} modified`}
              className="rounded-full bg-[var(--ne-primary-soft)] px-1.5 text-[10px] font-semibold leading-4 text-[var(--ne-primary)]"
            >
              {changedCount}
            </span>
          )}
          {action && <div>{action}</div>}
        </div>
      </div>
      <Collapsible.Content className="ne-motion-collapse">
        <div className="space-y-1">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
