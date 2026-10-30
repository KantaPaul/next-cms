import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  /** Shows a small dot, e.g. when a tab holds changed values. */
  changed?: boolean;
  /** Accessible name when the visible label is not enough. */
  ariaLabel?: string;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'segmented' | 'line';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  /** Accessible name for the tab list. */
  ariaLabel?: string;
  className?: string;
}

/** Arrow keys move between tabs (roving focus, wrapping), Home/End jump. */
function onTabKeyDown(
  event: React.KeyboardEvent<HTMLDivElement>,
  items: TabItem[],
  activeId: string,
  onChange: (id: string) => void
) {
  const index = items.findIndex(tab => tab.id === activeId);
  const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
  const step =
    event.key === 'ArrowRight'
      ? rtl
        ? -1
        : 1
      : event.key === 'ArrowLeft'
        ? rtl
          ? 1
          : -1
        : 0;
  let next = -1;
  if (step) next = (index + step + items.length) % items.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = items.length - 1;
  if (next < 0) return;
  event.preventDefault();
  onChange(items[next].id);
  const buttons =
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  buttons[next]?.focus();
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = 'segmented',
  size = 'md',
  fullWidth = true,
  ariaLabel,
  className = '',
}) => {
  if (variant === 'segmented') {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={e => onTabKeyDown(e, items, activeId, onChange)}
        className={`inline-flex items-center p-0.5 bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {items.map(tab => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tab.ariaLabel}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`flex items-center justify-center gap-1.5 px-2.5 transition-all text-xs font-sans rounded-[var(--ne-radius-sm)] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)] ${
                fullWidth ? 'min-w-0 flex-1' : ''
              } ${size === 'sm' ? 'h-5 text-[11px]' : 'h-6'} ${
                isActive
                  ? 'bg-[var(--ne-surface)] text-[var(--ne-text)] font-medium shadow-xs border border-[var(--ne-border)]'
                  : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] border border-transparent'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="ms-1 text-[10px] tabular-nums font-mono opacity-70">
                  {tab.badge}
                </span>
              )}
              {tab.changed && (
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ne-primary)]"
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={e => onTabKeyDown(e, items, activeId, onChange)}
      className={`flex items-center border-b border-[var(--ne-border)] ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {items.map(tab => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={tab.ariaLabel}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-sans border-b-2 cursor-pointer select-none transition-colors -mb-[1px] focus-visible:outline-none ${
              fullWidth ? 'min-w-0 flex-1' : ''
            } ${
              isActive
                ? 'border-[var(--ne-primary)] text-[var(--ne-primary)] font-medium'
                : 'border-transparent text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:border-[var(--ne-border-strong)]'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ms-1 text-[10px] tabular-nums font-mono opacity-70">
                {tab.badge}
              </span>
            )}
            {tab.changed && (
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ne-primary)]"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
