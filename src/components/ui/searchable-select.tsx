'use client';

import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { type CSSProperties, useMemo, useState } from 'react';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';

export type SearchableSelectOption<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
  keywords?: string[];
};

export type SearchableSelectGroup<T extends string = string> = {
  label: string;
  options: SearchableSelectOption<T>[];
};

export type SearchableSelectProps<T extends string = string> = {
  value?: T;
  onValueChange: (value: T | undefined) => void;
  options?: SearchableSelectOption<T>[];
  groups?: SearchableSelectGroup<T>[];
  /** Trigger text when no value is selected. */
  placeholder?: string;
  /** Optional clear/default option rendered at the top of the list. */
  emptyOptionLabel?: string;
  /** Label shown when `value` is set but missing from `options` and `groups`. */
  missingLabel?: string;
  /** Placeholder inside the search input. */
  searchPlaceholder?: string;
  /** Message shown when no options match the search query. */
  emptyMessage?: string;
  disabled?: boolean;
  size?: 'sm' | 'default';
  className?: string;
  style?: CSSProperties;
  id?: string;
  'aria-label'?: string;
  title?: string;
};

export function SearchableSelect<T extends string = string>({
  value,
  onValueChange,
  options = [],
  groups = [],
  placeholder = 'Select…',
  emptyOptionLabel,
  missingLabel,
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found.',
  disabled,
  size = 'default',
  className,
  style,
  id,
  'aria-label': ariaLabel,
  title,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const allOptions = useMemo(
    () => [...options, ...groups.flatMap(g => g.options)],
    [options, groups]
  );

  const hasValue = value !== undefined && value !== ('' as T);
  const selected = useMemo(
    () => (hasValue ? allOptions.find(o => o.value === value) : undefined),
    [allOptions, hasValue, value]
  );
  const isMissing = hasValue && !selected;

  const q = query.trim().toLowerCase();

  const matchesQuery = (opt: SearchableSelectOption<T>, groupLabel?: string) => {
    if (!q) return true;
    if (opt.label.toLowerCase().includes(q)) return true;
    if (groupLabel && groupLabel.toLowerCase().includes(q)) return true;
    return opt.keywords?.some(k => k.toLowerCase().includes(q)) ?? false;
  };

  const filteredOptions = useMemo(
    () => options.filter(o => matchesQuery(o)),
    [options, q]
  );

  const filteredGroups = useMemo(
    () =>
      groups
        .map(g => ({
          label: g.label,
          options: g.options.filter(o => matchesQuery(o, g.label)),
        }))
        .filter(g => g.options.length > 0),
    [groups, q]
  );

  const showEmptyOption =
    Boolean(emptyOptionLabel) &&
    (!q || emptyOptionLabel!.toLowerCase().includes(q));

  const hasVisibleItems =
    showEmptyOption ||
    (isMissing && !q) ||
    filteredOptions.length > 0 ||
    filteredGroups.length > 0;

  const displayLabel = selected
    ? selected.label
    : isMissing
      ? (missingLabel ?? String(value))
      : (emptyOptionLabel ?? placeholder);

  const isPlaceholder = !selected && !isMissing;

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          title={title}
          disabled={disabled}
          style={style}
          data-slot="select-trigger"
          data-size={size}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 dark:bg-input/30 dark:hover:bg-input/50',
            isPlaceholder && 'text-muted-foreground',
            className
          )}
        >
          <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[100000] w-[var(--radix-popover-trigger-width)] min-w-52 p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            {showEmptyOption && (
              <CommandGroup>
                <CommandItem
                  value="__empty__"
                  onSelect={() => {
                    onValueChange(undefined);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'size-4 shrink-0',
                      !hasValue ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{emptyOptionLabel}</span>
                </CommandItem>
              </CommandGroup>
            )}
            {isMissing && !q && (
              <CommandGroup>
                <CommandItem
                  value={`__missing__:${String(value)}`}
                  onSelect={() => {
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <CheckIcon className="size-4 shrink-0 opacity-100" />
                  <span className="truncate">
                    {missingLabel ?? String(value)}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map(option => {
                  const isSelected = hasValue && option.value === value;
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      onSelect={() => {
                        onValueChange(option.value);
                        setOpen(false);
                        setQuery('');
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          'size-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {filteredGroups.map(group => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.options.map(option => {
                  const isSelected = hasValue && option.value === value;
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${group.label}:${option.value}`}
                      disabled={option.disabled}
                      onSelect={() => {
                        onValueChange(option.value);
                        setOpen(false);
                        setQuery('');
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          'size-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            {!hasVisibleItems && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
