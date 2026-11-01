import { Filter, Search, X } from 'lucide-react';
import React from 'react';
import { cn } from '../lib/cn';

/** The inspector's "Search settings…" box; clears with the X or Escape. */
export interface SettingsSearchProps {
  value: string;
  onChange: (query: string) => void;
  /** Shown at the end of the box while the query is empty. */
  matchesCount?: number;
  placeholder?: string;
  className?: string;
}

export const SettingsSearch: React.FC<SettingsSearchProps> = ({
  value,
  onChange,
  matchesCount,
  placeholder = 'Search settings…',
  className,
}) => (
  <div className={cn('relative min-w-0 flex-1', className)}>
    <Search
      aria-hidden
      className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ne-text-muted)]"
    />
    <input
      type="text"
      role="searchbox"
      aria-label="Search settings"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Escape' && value) {
          e.stopPropagation();
          onChange('');
        }
      }}
      className="h-7 w-full rounded-[var(--ne-radius-md)] border border-transparent bg-[var(--ne-surface-subtle)] ps-7 pe-7 text-xs text-[var(--ne-text)] outline-none transition-colors placeholder:text-[var(--ne-text-muted)] hover:border-[var(--ne-border)] focus:border-[var(--ne-primary)] focus:bg-[var(--ne-surface)]"
    />
    {value ? (
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => onChange('')}
        className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    ) : matchesCount !== undefined && matchesCount > 0 ? (
      <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--ne-text-muted)]">
        {matchesCount}
      </span>
    ) : null}
  </div>
);

/** "Show only changed" toggle with the count of modified settings. */
export interface ChangedFilterProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  changedTotal?: number;
  label?: string;
  className?: string;
}

export const ChangedFilter: React.FC<ChangedFilterProps> = ({
  checked,
  onChange,
  changedTotal = 0,
  label = 'Show only changed',
  className,
}) => (
  <button
    type="button"
    aria-pressed={checked}
    title="Show only settings that differ from the block's defaults"
    onClick={() => onChange(!checked)}
    className={cn(
      'inline-flex h-7 shrink-0 select-none items-center gap-1.5 rounded-[var(--ne-radius-md)] border px-2 text-xs transition-colors',
      checked
        ? 'border-[var(--ne-primary)] bg-[var(--ne-primary-soft)] font-medium text-[var(--ne-primary)]'
        : 'border-[var(--ne-border)] bg-[var(--ne-surface)] text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]',
      className
    )}
  >
    <Filter aria-hidden className="h-3 w-3" />
    <span className="whitespace-nowrap">{label}</span>
    {changedTotal > 0 && (
      <span
        className={cn(
          'rounded-full px-1 text-[10px] leading-4',
          checked
            ? 'bg-[var(--ne-primary)] text-white'
            : 'bg-[var(--ne-surface-subtle)] text-[var(--ne-text-muted)]'
        )}
      >
        {changedTotal}
      </span>
    )}
  </button>
);
