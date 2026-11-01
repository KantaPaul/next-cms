import React from 'react';
import { cn } from '../lib/cn';
import { Tooltip } from '../primitives/Tooltip';

export interface ToolRailItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface ToolRailProps {
  items: ToolRailItem[];
  bottomItems?: ToolRailItem[];
  activeId?: string;
  ariaLabel?: string;
  className?: string;
}

export const ToolRail: React.FC<ToolRailProps> = ({
  items,
  bottomItems,
  activeId,
  ariaLabel = 'Editor tools',
  className,
}) => {
  const renderItem = (item: ToolRailItem) => {
    const isActive = item.active ?? (activeId ? item.id === activeId : false);

    const tooltipContent = (
      <span className="flex items-center gap-1.5">
        <span>{item.label}</span>
        {item.shortcut && (
          <span className="rounded bg-[var(--ne-surface-subtle)] px-1 py-0.2 text-[10px] text-[var(--ne-text-muted)] font-mono">
            {item.shortcut}
          </span>
        )}
      </span>
    );

    return (
      <Tooltip key={item.id} content={tooltipContent} side="right">
        <button
          type="button"
          aria-label={item.label}
          aria-pressed={isActive}
          disabled={item.disabled}
          onClick={item.onClick}
          className={cn(
            'group relative flex h-9 w-9 items-center justify-center rounded-[var(--ne-radius-md)] transition-colors',
            isActive
              ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]'
              : 'text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)]',
            item.disabled && 'cursor-not-allowed opacity-40'
          )}
        >
          {item.icon}

          {/* Active side indicator pill */}
          {isActive && (
            <div className="absolute -left-1 top-1.5 bottom-1.5 w-1 rounded-r bg-[var(--ne-primary)]" />
          )}

          {/* Badge */}
          {item.badge !== undefined && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ne-primary)] px-1 text-[9px] font-bold text-white">
              {item.badge}
            </span>
          )}
        </button>
      </Tooltip>
    );
  };

  return (
    <nav
      role="toolbar"
      aria-label={ariaLabel}
      className={cn(
        'flex h-full w-12 shrink-0 flex-col items-center justify-between border-e border-[var(--ne-border)] bg-[var(--ne-surface)] py-2 select-none',
        className
      )}
    >
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
        {items.map(renderItem)}
      </div>

      {bottomItems && bottomItems.length > 0 && (
        <div className="flex flex-col items-center gap-1.5 w-full px-1.5 border-t border-[var(--ne-border)] pt-2">
          {bottomItems.map(renderItem)}
        </div>
      )}
    </nav>
  );
};
