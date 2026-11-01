import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import React from 'react';
import { cn } from '../lib/cn';
import { useLayerScope } from '../theme/EditorUIProvider';

export const DEFAULT_UNITS = [
  'px',
  '%',
  'rem',
  'em',
  'vw',
  'vh',
  'auto',
] as const;

export interface UnitSelectProps {
  value: string;
  onChange: (unit: string) => void;
  units?: readonly string[] | string[];
  disabled?: boolean;
  size?: 'sm' | 'md';
  variant?: 'default' | 'compact';
  className?: string;
  'aria-label'?: string;
  id?: string;
}

export const UnitSelect: React.FC<UnitSelectProps> = ({
  value,
  onChange,
  units = DEFAULT_UNITS,
  disabled = false,
  size = 'md',
  variant = 'default',
  className,
  'aria-label': ariaLabel = 'Unit',
  id,
}) => {
  const layer = useLayerScope();

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-between gap-1 font-mono uppercase select-none transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'default'
            ? cn(
                'rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] text-[var(--ne-text)] hover:border-[var(--ne-border-strong)]',
                size === 'sm' ? 'h-6 text-[10px] px-1.5' : 'h-7 text-xs px-2'
              )
            : 'h-full border-none bg-transparent px-1.5 text-[10px] text-[var(--ne-text-subtle)] hover:text-[var(--ne-text)]',
          className
        )}
      >
        <SelectPrimitive.Value placeholder={value || units[0] || 'px'}>
          {value || units[0] || 'px'}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
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
            'ne-motion-pop z-50 min-w-[64px] overflow-hidden rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-1 text-[var(--ne-text)] shadow-lg'
          )}
        >
          <SelectPrimitive.Viewport>
            {units.map(unit => (
              <SelectPrimitive.Item
                key={unit}
                value={unit}
                className="relative flex cursor-pointer select-none items-center justify-between rounded-[var(--ne-radius-sm)] px-2 py-1 font-mono text-[11px] uppercase text-[var(--ne-text)] outline-none hover:bg-[var(--ne-surface-hover)] focus:bg-[var(--ne-primary-soft)] focus:text-[var(--ne-primary)] data-[state=checked]:font-semibold data-[state=checked]:text-[var(--ne-primary)]"
              >
                <SelectPrimitive.ItemText>{unit}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
};
