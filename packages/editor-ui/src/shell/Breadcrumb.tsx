import { ChevronRight } from 'lucide-react';
import type React from 'react';
import { cn } from '../lib/cn';

export interface BreadcrumbItem {
  id?: string;
  label: string;
  /** Called when this crumb is chosen; falls back to the list's `onSelect`. */
  onSelect?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onSelect?: (id: string) => void;
  emptyLabel?: string;
  /** Accessible name for the trail, e.g. "Block path". */
  ariaLabel?: string;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  onSelect,
  emptyLabel = 'No selection',
  ariaLabel = 'Breadcrumb',
  className,
}) => {
  if (items.length === 0) {
    return (
      <span className="text-[11px] text-[var(--ne-text-muted)]">
        {emptyLabel}
      </span>
    );
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'flex min-w-0 select-none items-center gap-1 text-[11px]',
        className
      )}
    >
      <ol className="flex min-w-0 items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const select =
            item.onSelect ??
            (item.id && onSelect
              ? () => onSelect(item.id as string)
              : undefined);
          return (
            <li
              key={item.id ?? index}
              className="flex min-w-0 items-center gap-1"
            >
              {index > 0 && (
                <ChevronRight
                  aria-hidden
                  className="h-3 w-3 shrink-0 text-[var(--ne-text-subtle)] rtl:-scale-x-100"
                />
              )}
              {select ? (
                <button
                  type="button"
                  onClick={select}
                  aria-current={isLast ? 'location' : undefined}
                  className={cn(
                    'max-w-[140px] cursor-pointer truncate rounded-[var(--ne-radius-sm)] px-1 py-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]',
                    isLast
                      ? 'bg-[var(--ne-primary-soft)] font-medium text-[var(--ne-primary)]'
                      : 'text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)]'
                  )}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  aria-current={isLast ? 'location' : undefined}
                  className={cn(
                    'max-w-[140px] truncate px-1 py-0.5',
                    isLast
                      ? 'font-medium text-[var(--ne-text)]'
                      : 'text-[var(--ne-text-muted)]'
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
