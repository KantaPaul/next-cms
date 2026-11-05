import React from 'react';
import { useId, useRef } from 'react';
import { cn } from '../lib/cn';
import {
  SlidingIndicator,
  useSlidingIndicator,
} from '../lib/motion/useSlidingIndicator';
import { type ControlDeviceState, ControlRow } from './ControlRow';

export interface ChooseOption<T extends string = string> {
  value: T;
  label?: string;
  icon?: React.ReactNode;
  title?: string;
  disabled?: boolean;
}

export interface ChooseFieldProps<T extends string = string> {
  id?: string;
  label?: string;
  value?: T;
  onChange: (value: T) => void;
  options: readonly ChooseOption<T>[] | ChooseOption<T>[];
  info?: string;
  changed?: boolean;
  onReset?: () => void;
  tokenName?: string;
  onClearToken?: () => void;
  deviceState?: ControlDeviceState;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ChooseField<T extends string = string>({
  id,
  label,
  value,
  onChange,
  options,
  info,
  changed,
  onReset,
  tokenName,
  onClearToken,
  deviceState,
  helperText,
  errorText,
  disabled = false,
  fullWidth = true,
  size = 'md',
  className,
}: ChooseFieldProps<T>) {
  const generatedId = useId();
  const fieldId =
    id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || options.length === 0) return;
    const enabledOptions = options.filter(opt => !opt.disabled);
    if (enabledOptions.length === 0) return;

    const currentIndex = enabledOptions.findIndex(opt => opt.value === value);

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % enabledOptions.length;
      onChange(enabledOptions[nextIndex].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex =
        (currentIndex - 1 + enabledOptions.length) % enabledOptions.length;
      onChange(enabledOptions[prevIndex].value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(enabledOptions[0].value);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(enabledOptions[enabledOptions.length - 1].value);
    }
  };

  const groupRef = useRef<HTMLDivElement>(null);
  useSlidingIndicator(groupRef, String(value));
  const content = (
    <div
      ref={groupRef}
      id={fieldId}
      role="radiogroup"
      aria-label={label ?? 'Choose option'}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative inline-flex items-center rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-0.5 gap-0.5',
        fullWidth && 'w-full',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <SlidingIndicator />
      {options.map(option => {
        const isSelected = option.value === value;
        const isItemDisabled = disabled || option.disabled;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-ne-active={isSelected ? 'true' : undefined}
            tabIndex={isSelected ? 0 : -1}
            disabled={isItemDisabled}
            title={option.title ?? option.label ?? option.value}
            aria-label={option.title ?? option.label ?? option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1 rounded-[var(--ne-radius-sm)] font-medium transition-colors select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40',
              fullWidth ? 'flex-1' : 'px-2',
              size === 'sm' ? 'h-6 text-[11px] px-1.5' : 'h-7 text-xs px-2.5',
              isSelected
                ? 'text-[var(--ne-text)] font-semibold'
                : 'text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)]'
            )}
          >
            {option.icon && (
              <span className="shrink-0 flex items-center justify-center">
                {option.icon}
              </span>
            )}
            {option.label && <span className="truncate">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );

  if (!label) {
    return <div className={className}>{content}</div>;
  }

  return (
    <ControlRow
      label={label}
      htmlFor={fieldId}
      info={info}
      changed={changed}
      onReset={onReset}
      tokenName={tokenName}
      onClearToken={onClearToken}
      deviceState={deviceState}
      helperText={helperText}
      errorText={errorText}
      className={className}
    >
      {content}
    </ControlRow>
  );
}
