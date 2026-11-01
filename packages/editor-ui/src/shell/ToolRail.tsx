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
  /**
   * `vertical` is the classic side rail; `horizontal` is the single-panel
   * footer bar (undo/redo, view routes, change count, command palette).
   */
  orientation?: 'vertical' | 'horizontal';
  /** Horizontal only: content before the route buttons (e.g. undo/redo). */
  leading?: React.ReactNode;
  /** Horizontal only: content after the route buttons (e.g. change chip). */
  trailing?: React.ReactNode;
  className?: string;
}

const Divider = () => (
  <div aria-hidden className="mx-1 h-4 w-px shrink-0 bg-[var(--ne-border)]" />
);

export const ToolRail: React.FC<ToolRailProps> = ({
  items,
  bottomItems,
  activeId,
  ariaLabel = 'Editor tools',
  orientation = 'vertical',
  leading,
  trailing,
  className,
}) => {
  const horizontal = orientation === 'horizontal';

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
      <Tooltip
        key={item.id}
        content={tooltipContent}
        side={horizontal ? 'top' : 'right'}
      >
        <button
          type="button"
          aria-label={item.label}
          aria-pressed={isActive}
          disabled={item.disabled}
          onClick={item.onClick}
          className={cn(
            'group relative flex items-center justify-center rounded-[var(--ne-radius-md)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]',
            horizontal ? 'h-7 w-7' : 'h-9 w-9',
            isActive
              ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]'
              : 'text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)]',
            item.disabled && 'cursor-not-allowed opacity-40'
          )}
        >
          {item.icon}

          {/* Active side indicator pill (side rail only) */}
          {isActive && !horizontal && (
            <div className="absolute -left-1 top-1.5 bottom-1.5 w-1 rounded-r bg-[var(--ne-primary)]" />
          )}

          {/* Badge */}
          {item.badge !== undefined && (
            <span
              className={cn(
                'absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ne-primary)] px-1 text-[9px] font-bold text-white',
                horizontal ? '-top-1 -right-1' : 'top-1 right-1'
              )}
            >
              {item.badge}
            </span>
          )}
        </button>
      </Tooltip>
    );
  };

  if (horizontal) {
    return (
      <nav
        role="toolbar"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        className={cn(
          'flex shrink-0 items-center gap-0.5 border-t border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] px-2 py-1.5 select-none',
          className
        )}
      >
        {leading && (
          <>
            <div className="flex shrink-0 items-center gap-0.5">{leading}</div>
            <Divider />
          </>
        )}
        <div className="flex min-w-0 items-center gap-0.5">
          {items.map(renderItem)}
        </div>
        {(trailing || (bottomItems && bottomItems.length > 0)) && <Divider />}
        <div className="ms-auto flex shrink-0 items-center gap-1">
          {trailing}
          {bottomItems?.map(renderItem)}
        </div>
      </nav>
    );
  }

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
