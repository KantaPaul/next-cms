import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type React from 'react';
import { forwardRef } from 'react';
import { cn } from '../lib/cn';
import { useLayerScope } from '../theme/EditorUIProvider';

/**
 * Select on Radix (B15 E2b): an animated, keyboard-friendly list (arrows,
 * typeahead, Home/End), collision-aware, flipping in RTL. Same props as the
 * native version it replaces: `options`, `value`, and an `onChange` that
 * receives `{ target: { value } }`, so existing callers keep working. An
 * option with an empty value (e.g. "Choose…") becomes the placeholder.
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Value-only callback, for new callers. */
  onValueChange?: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  'aria-label'?: string;
  className?: string;
}

const HEIGHT = {
  sm: 'h-6 text-xs ps-2 pe-1.5',
  md: 'h-7 text-xs ps-2.5 pe-2',
  lg: 'h-8 text-sm ps-3 pe-2',
} as const;

/** Wraps a value the way a native <select> change event would expose it. */
function changeEvent(value: string) {
  return {
    target: { value },
    currentTarget: { value },
  } as unknown as React.ChangeEvent<HTMLSelectElement>;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      onChange,
      onValueChange,
      size = 'md',
      fullWidth = true,
      disabled,
      id,
      name,
      placeholder,
      'aria-label': ariaLabel,
      className,
    },
    ref
  ) => {
    const layer = useLayerScope();
    const empty = options.find(option => option.value === '');
    const items = options.filter(option => option.value !== '');
    return (
      <SelectPrimitive.Root
        value={value === '' ? undefined : value}
        defaultValue={defaultValue}
        onValueChange={next => {
          onValueChange?.(next);
          onChange?.(changeEvent(next));
        }}
        disabled={disabled}
        name={name}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          aria-label={ariaLabel}
          className={cn(
            'inline-flex items-center justify-between gap-2 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] text-[var(--ne-text)] transition-colors hover:border-[var(--ne-border-strong)] focus:outline-none focus-visible:border-[var(--ne-primary)] focus-visible:ring-1 focus-visible:ring-[var(--ne-primary)] disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[var(--ne-text-subtle)]',
            HEIGHT[size],
            fullWidth && 'w-full',
            className
          )}
        >
          <span className="min-w-0 truncate">
            <SelectPrimitive.Value
              placeholder={placeholder ?? empty?.label ?? 'Choose…'}
            />
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--ne-text-muted)]" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            collisionPadding={8}
            {...layer}
            className={cn(
              layer.className,
              'ne-motion-pop z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] text-[var(--ne-text)] shadow-lg'
            )}
          >
            <SelectPrimitive.Viewport className="p-1">
              {items.map(option => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="relative flex cursor-pointer select-none items-center rounded-[var(--ne-radius-sm)] py-1.5 pe-2 ps-7 text-xs outline-none transition-colors data-[disabled]:cursor-not-allowed data-[highlighted]:bg-[var(--ne-surface-hover)] data-[disabled]:opacity-40"
                >
                  <span className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-3.5 w-3.5 text-[var(--ne-primary)]" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);

Select.displayName = 'Select';
