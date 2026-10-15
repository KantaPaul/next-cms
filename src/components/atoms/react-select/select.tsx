'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { FieldError, Label } from '@/components/atoms/forms';
import FieldHelperText from '@/components/atoms/forms/helpers/field-helper-text';
import { Box } from '@/components/atoms/layout';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
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

export type Option = {
  label: string;
  value: string;
  icon?: React.ReactNode;
  isLink?: boolean;
  [key: string]: unknown;
};

export const sizes = {
  sm: 'h-8 text-xs px-2.5 py-1',
  md: 'h-9 text-sm px-3 py-1.5',
  lg: 'h-10 text-sm px-3.5 py-2',
};

export type Size = keyof typeof sizes;

export interface SelectProps<
  TOption = Option,
  IsMulti extends boolean = false,
  _Group = any,
> {
  value?: any;
  error?: string;
  label?: string;
  size?: Size;
  prefix?: React.ReactNode;
  helperText?: React.ReactNode;
  helperClassName?: string;
  variant?: 'text' | 'outline' | 'shadow';
  isReadOnly?: boolean;
  isRequired?: boolean;
  allowSelectAll?: boolean;
  labelClassName?: string;
  errorClassName?: string;
  singleValueClassName?: string;
  selectedItemCount?: number;
  onClear?: () => void;
  isMulti?: IsMulti;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  className?: string;
  classNames?: any;
  placeholder?: string;
  options?: any;
  onChange?: (newValue: any, actionMeta?: any) => void;
  onBlur?: (e: any) => void;
  onFocus?: (e: any) => void;
  name?: string;
  id?: string;
  menuPlacement?: 'auto' | 'bottom' | 'top';
  [key: string]: any;
}

type GroupOption = {
  label?: string;
  options: Option[];
};

function normalizeOptions(options: any): { flat: Option[]; groups: GroupOption[] } {
  if (!options || !Array.isArray(options)) {
    return { flat: [], groups: [] };
  }

  if (options.length > 0 && Array.isArray(options[0]?.options)) {
    const groups = options as GroupOption[];
    const flat = groups.flatMap((g) => g.options || []);
    return { flat, groups };
  }

  const flat = options as Option[];
  return { flat, groups: [{ options: flat }] };
}

export function ReactSelect({
  ref,
  ...props
}: SelectProps<Option, boolean> & { ref?: React.Ref<HTMLButtonElement> }) {
    const {
      value,
      error,
      label,
      size = 'lg',
      variant = 'outline',
      isMulti = false,
      prefix,
      isReadOnly,
      isRequired,
      helperText,
      helperClassName,
      selectedItemCount = 3,
      labelClassName,
      isSearchable = true,
      isClearable,
      isDisabled,
      errorClassName,
      onClear,
      className,
      placeholder = 'Select...',
      allowSelectAll,
      options,
      onChange,
      isLoading,
      id,
    } = props;

    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState('');

    const { flat: allOptions, groups } = React.useMemo(
      () => normalizeOptions(options),
      [options]
    );

    // Selected values extraction
    const selectedValues: string[] = React.useMemo(() => {
      if (value === undefined || value === null || value === '') return [];
      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'object' && v !== null ? v.value : String(v)));
      }
      if (typeof value === 'object' && value !== null) {
        return value.value !== undefined ? [String(value.value)] : [];
      }
      return [String(value)];
    }, [value]);

    const selectedOptions: Option[] = React.useMemo(() => {
      return selectedValues.map((val) => {
        const found = allOptions.find((opt) => String(opt.value) === val);
        return found ?? { label: val, value: val };
      });
    }, [selectedValues, allOptions]);

    const isAllSelected =
      allOptions.length > 0 &&
      allOptions.every((opt) => selectedValues.includes(String(opt.value)));
    const isIndeterminate =
      !isAllSelected &&
      allOptions.some((opt) => selectedValues.includes(String(opt.value)));

    const handleSelectOption = (opt: Option) => {
      const optVal = String(opt.value);
      if (isMulti) {
        let updated: Option[];
        const exists = selectedValues.includes(optVal);
        if (exists) {
          updated = selectedOptions.filter((o) => String(o.value) !== optVal);
          onChange?.(updated, { action: 'deselect-option', option: opt });
        } else {
          updated = [...selectedOptions, opt];
          onChange?.(updated, { action: 'select-option', option: opt });
        }
      } else {
        onChange?.(opt, { action: 'select-option', option: opt });
        setOpen(false);
      }
    };

    const handleSelectAll = () => {
      if (isAllSelected) {
        onChange?.([], { action: 'clear' });
      } else {
        onChange?.(allOptions, { action: 'select-option' });
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClear) {
        onClear();
      } else {
        onChange?.(isMulti ? [] : null, { action: 'clear' });
      }
    };

    const handleRemoveOption = (e: React.MouseEvent, opt: Option) => {
      e.stopPropagation();
      const updated = selectedOptions.filter((o) => String(o.value) !== String(opt.value));
      onChange?.(updated, { action: 'remove-value', removedValue: opt });
    };

    const showClearButton =
      !isDisabled &&
      !isReadOnly &&
      (isClearable ?? (isRequired ? false : true)) &&
      selectedValues.length > 0;

    return (
      <Box className={cn('grid w-full grid-cols-1 gap-1.5', className)}>
        {label && (
          <Label className={cn('text-sm font-medium', labelClassName)}>
            {label}{' '}
            {isRequired && <span className="text-destructive">*</span>}
          </Label>
        )}

        <Popover open={open} onOpenChange={isDisabled || isReadOnly ? undefined : setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={ref}
              type="button"
              id={id}
              disabled={isDisabled || isReadOnly}
              aria-expanded={open}
              className={cn(
                'group flex w-full items-center justify-between rounded-md border border-input bg-background text-left transition-colors',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
                sizes[size],
                error && 'border-destructive focus-visible:ring-destructive/20',
                variant === 'shadow' && 'shadow-xs',
                variant === 'text' && 'border-transparent bg-transparent shadow-none hover:bg-accent/40'
              )}
            >
              <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
                {prefix && <span className="shrink-0">{prefix}</span>}

                {/* Display selections */}
                {selectedValues.length === 0 ? (
                  <span className="truncate text-muted-foreground">{placeholder}</span>
                ) : isMulti ? (
                  <div className="flex flex-wrap items-center gap-1 overflow-hidden py-0.5">
                    {selectedOptions.slice(0, selectedItemCount).map((opt) => (
                      <Badge
                        key={String(opt.value)}
                        variant="secondary"
                        className="flex items-center gap-1 px-1.5 py-0 text-xs font-normal"
                      >
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <span className="truncate max-w-[120px]">{opt.label}</span>
                        {!isDisabled && !isReadOnly && (
                          <X
                            className="size-3 cursor-pointer opacity-70 hover:opacity-100"
                            onClick={(e) => handleRemoveOption(e, opt)}
                          />
                        )}
                      </Badge>
                    ))}
                    {selectedOptions.length > selectedItemCount && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-xs font-normal">
                        +{selectedOptions.length - selectedItemCount}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 truncate">
                    {selectedOptions[0]?.icon}
                    <span className="truncate">{selectedOptions[0]?.label}</span>
                  </div>
                )}
              </div>

              {/* Trailing icons */}
              <div className="flex items-center gap-1 pl-1">
                {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                {showClearButton && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleClear}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </span>
                )}
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </div>
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0"
            align="start"
            sideOffset={4}
          >
            <Command className="w-full">
              {isSearchable && (
                <CommandInput
                  placeholder="Search..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
              )}
              <CommandList className="max-h-60 overflow-y-auto">
                <CommandEmpty>No options found.</CommandEmpty>

                {isMulti && allowSelectAll && allOptions.length > 0 && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleSelectAll}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                      />
                      <span className="font-medium">Select All</span>
                    </CommandItem>
                  </CommandGroup>
                )}

                {groups.map((group, groupIdx) => (
                  <CommandGroup key={groupIdx} heading={group.label}>
                    {group.options.map((opt) => {
                      const isSelected = selectedValues.includes(String(opt.value));
                      return (
                        <CommandItem
                          key={String(opt.value)}
                          value={`${opt.label} ${String(opt.value)}`}
                          onSelect={() => handleSelectOption(opt)}
                          className="flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isMulti && (
                              <Checkbox checked={isSelected} className="pointer-events-none" />
                            )}
                            {opt.icon}
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {!isMulti && isSelected && (
                            <Check className="size-4 text-primary shrink-0" />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {error && (
          <FieldError error={error} className={cn('text-xs', errorClassName)} />
        )}

        {helperText && (
          <FieldHelperText
            size="md"
            className={cn('text-muted-foreground', helperClassName)}
          >
            {helperText}
          </FieldHelperText>
        )}
      </Box>
    );
}
