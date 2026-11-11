import * as SwitchPrimitive from '@radix-ui/react-switch';
import React, { useEffect, useRef, useState } from 'react';
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
  variant?: 'default' | 'liquid';
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  'aria-label': ariaLabel,
  className,
  variant = 'default',
}) => {
  const prev = useRef<boolean | null>(null);
  const [stretching, setStretching] = useState(false);

  useEffect(() => {
    if (variant !== 'liquid') {
      prev.current = checked;
      setStretching(false);
      return;
    }
    if (prev.current === null) {
      prev.current = checked;
      return;
    }
    if (prev.current === checked) return;
    prev.current = checked;
    // Stretch only after a real change, never on mount/open.
    setStretching(true);
    const t = window.setTimeout(() => setStretching(false), 220);
    return () => window.clearTimeout(t);
  }, [checked, variant]);

  const liquid = variant === 'liquid';

  return (
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
        data-ne-switch-variant={variant}
        data-ne-switch-stretch={stretching ? 'true' : undefined}
        className={cn(
          'peer relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full bg-[var(--ne-border-strong)] transition-colors duration-[var(--ne-duration-normal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ne-focus-ring)] disabled:cursor-not-allowed data-[state=checked]:bg-[var(--ne-primary)]',
          liquid && 'overflow-hidden'
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block h-3 rounded-full bg-white shadow-xs',
            liquid
              ? 'w-3 origin-center transition-[translate,scale,width] duration-[var(--ne-duration-normal)] ease-[var(--ne-easing)] data-[state=checked]:translate-x-3.5 rtl:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-3.5 translate-x-0.5 data-[state=checked]:[scale:1.35_0.82] [scale:1]'
              : 'w-3 translate-x-0.5 transition-[translate] duration-[var(--ne-duration-normal)] ease-[var(--ne-easing)] data-[state=checked]:translate-x-3.5 rtl:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-3.5'
          )}
          style={
            liquid && stretching
              ? { width: '0.95rem', transformOrigin: 'center' }
              : undefined
          }
        />
      </SwitchPrimitive.Root>
      {label && <span className="text-xs text-[var(--ne-text)]">{label}</span>}
    </label>
  );
};
