import * as React from 'react';
import { cn } from '../lib/cn';

export interface BreadcrumbItem {
  label: string;
  onSelect?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-xs text-[var(--ne-text-muted)]', className)}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden className="opacity-50">/</span>}
          {item.onSelect ? (
            <button
              type="button"
              onClick={item.onSelect}
              className="rounded-[var(--ne-radius-sm)] px-1 py-0.5 hover:bg-[var(--ne-bg)] hover:text-[var(--ne-text)]"
            >
              {item.label}
            </button>
          ) : (
            <span className="px-1 py-0.5 text-[var(--ne-text)]">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}