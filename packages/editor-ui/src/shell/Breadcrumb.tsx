import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  id: string;
  label: string;
  type?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onSelect: (id: string) => void;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  onSelect,
  className = '',
}) => {
  if (!items || items.length === 0) {
    return <span className="text-[11px] text-[var(--ne-text-muted)] font-sans">No selection</span>;
  }

  return (
    <nav className={`flex items-center gap-1 text-[11px] font-sans truncate select-none ${className}`}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={item.id}>
            {idx > 0 && (
              <ChevronRight className="w-3 h-3 text-[var(--ne-text-subtle)] shrink-0" />
            )}
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`truncate max-w-[140px] px-1 py-0.5 rounded-[var(--ne-radius-sm)] transition-colors cursor-pointer ${
                isLast
                  ? 'text-[var(--ne-primary)] font-medium bg-[var(--ne-primary-soft)]'
                  : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)]'
              }`}
            >
              {item.label}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
