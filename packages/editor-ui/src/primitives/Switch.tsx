import * as SwitchPrimitive from '@radix-ui/react-switch';
import type React from 'react';
import { cn } from '../lib/cn';

/**
 * Switch on Radix (B15 E2b): Space/Enter toggle, a smooth sliding knob that
 * flips in RTL, and a label that toggles it. Same props as before.
 */
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  /** Id for the switch, so an outside <label htmlFor> can name it. */
  id?: string;
  'aria-label'?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  'aria-label': ariaLabel,
  className,
}) => (
  <label
    className={cn(
      'inline-flex cursor-pointer select-none items-center gap-2',
      disabled && 'cursor-not-allowed opacity-40',
      className
    )}
  >
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className="peer relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full bg-[var(--ne-border-strong)] transition-colors duration-[var(--ne-duration-normal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ne-focus-ring)] disabled:cursor-not-allowed data-[state=checked]:bg-[var(--ne-primary)]"
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-3 w-3 translate-x-0.5 rounded-full bg-white shadow-xs transition-[translate] duration-[var(--ne-duration-normal)] ease-[var(--ne-easing)] data-[state=checked]:translate-x-3.5 rtl:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-3.5" />
    </SwitchPrimitive.Root>
    {label && <span className="text-xs text-[var(--ne-text)]">{label}</span>}
  </label>
);
