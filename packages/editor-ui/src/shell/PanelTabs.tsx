import React from 'react';
import { cn } from '../lib/cn';

export interface PanelTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
  /** Shows a modified dot: something in this tab differs from its default. */
  changed?: boolean;
  /** Keyboard shortcut shown in the tooltip, e.g. "⌥C". */
  shortcut?: string;
}

export interface PanelTabsProps {
  tabs: PanelTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'compact' | 'segmented';
  ariaLabel?: string;
  className?: string;
}

/** "⌥C" / "Alt+C" → "Alt+C" for aria-keyshortcuts. */
function ariaShortcut(shortcut: string): string {
  return shortcut.replace(/^⌥\s*/, 'Alt+').replace(/^Alt\s*\+\s*/i, 'Alt+');
}

export const PanelTabs: React.FC<PanelTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  ariaLabel = 'Panel tabs',
  className,
}) => {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const enabledTabs = tabs.filter(t => !t.disabled);
    const currentIndex = enabledTabs.findIndex(t => t.id === activeTab);
    if (currentIndex < 0) return;

    let nextIndex = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % enabledTabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = enabledTabs.length - 1;
    }

    if (nextIndex >= 0) {
      event.preventDefault();
      onChange(enabledTabs[nextIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'flex items-center gap-1 border-b border-[var(--ne-border)] bg-[var(--ne-surface)] px-2',
        variant === 'segmented' &&
          'mx-2 my-1.5 rounded-md border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-0.5',
        className
      )}
    >
      {tabs.map(tab => {
        const isSelected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isSelected}
            aria-controls={`panel-tabpanel-${tab.id}`}
            id={`panel-tab-${tab.id}`}
            disabled={tab.disabled}
            tabIndex={isSelected ? 0 : -1}
            title={tab.shortcut ? `${tab.label} (${tab.shortcut})` : undefined}
            aria-keyshortcuts={tab.shortcut ? ariaShortcut(tab.shortcut) : undefined}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium transition-colors select-none',
              variant === 'segmented'
                ? isSelected
                  ? 'rounded bg-[var(--ne-surface)] text-[var(--ne-text)] shadow-sm'
                  : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
                : isSelected
                  ? 'text-[var(--ne-primary)] font-semibold'
                  : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]',
              tab.disabled && 'cursor-not-allowed opacity-40'
            )}
          >
            {tab.icon && (
              <span className="shrink-0 flex items-center justify-center">
                {tab.icon}
              </span>
            )}
            <span className="truncate">{tab.label}</span>
            {tab.changed && (
              <span
                data-modified-dot=""
                aria-label="Has changes"
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  isSelected
                    ? 'bg-[var(--ne-primary)]'
                    : 'bg-[var(--ne-text-muted)]'
                )}
              />
            )}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full',
                  isSelected
                    ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]'
                    : 'bg-[var(--ne-surface-subtle)] text-[var(--ne-text-muted)]'
                )}
              >
                {tab.badge}
              </span>
            )}

            {/* Bottom active indicator line for default variant */}
            {variant === 'default' && isSelected && (
              <div className="absolute inset-x-1 -bottom-px h-[2px] bg-[var(--ne-primary)] rounded-t-sm" />
            )}
          </button>
        );
      })}
    </div>
  );
};
