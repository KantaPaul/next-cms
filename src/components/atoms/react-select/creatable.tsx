'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Plus, X } from 'lucide-react';
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
import { type Option, type SelectProps, type Size, sizes } from './select';

export interface CreatableSelectProps<IsMulti extends boolean = false>
  extends SelectProps<Option, IsMulti> {
  onCreateOption?: (inputValue: string) => void;
  loadOptions?: any;
}

export function CreatableSelect<IsMulti extends boolean = false>(
  props: CreatableSelectProps<IsMulti>
) {
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
    placeholder = 'Select or create...',
    options = [],
    onChange,
    onCreateOption,
    isLoading,
    id,
  } = props;

  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [createdOptions, setCreatedOptions] = React.useState<Option[]>([]);

  // Flattened options + locally created options
  const allOptions: Option[] = React.useMemo(() => {
    const base = Array.isArray(options) ? options : [];
    const map = new Map<string, Option>();
    base.forEach((o: Option) => map.set(String(o.value), o));
    createdOptions.forEach((o) => map.set(String(o.value), o));
    return Array.from(map.values());
  }, [options, createdOptions]);

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

  const canCreate =
    searchValue.trim().length > 0 &&
    !allOptions.some(
      (opt) => opt.label.toLowerCase() === searchValue.trim().toLowerCase()
    );

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

  const handleCreate = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newOpt: Option = { label: trimmed, value: trimmed };
    setCreatedOptions((prev) => [...prev, newOpt]);
    onCreateOption?.(trimmed);

    if (isMulti) {
      const updated = [...selectedOptions, newOpt];
      onChange?.(updated, { action: 'create-option', option: newOpt });
    } else {
      onChange?.(newOpt, { action: 'create-option', option: newOpt });
      setOpen(false);
    }
    setSearchValue('');
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
          {label} {isRequired && <span className="text-destructive">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={isDisabled || isReadOnly ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
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
                placeholder="Search or type to create..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
            )}
            <CommandList className="max-h-60 overflow-y-auto">
              <CommandEmpty>No options found.</CommandEmpty>

              {canCreate && (
                <CommandGroup>
                  <CommandItem
                    value={`create-${searchValue.trim()}`}
                    onSelect={() => handleCreate(searchValue)}
                    className="flex items-center gap-2 cursor-pointer font-medium text-primary"
                  >
                    <Plus className="size-4" />
                    <span>Create &ldquo;{searchValue.trim()}&rdquo;</span>
                  </CommandItem>
                </CommandGroup>
              )}

              <CommandGroup>
                {allOptions.map((opt) => {
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
