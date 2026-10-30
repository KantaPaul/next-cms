import type React from 'react';
import { cn } from '../lib/cn';

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** A small pill button, for presets, filters and quick choices. */
export const Chip: React.FC<ChipProps> = ({
  active = false,
  className,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    aria-pressed={props.onClick && active ? true : undefined}
    className={cn(
      'cursor-pointer rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50',
      active
        ? 'border-[var(--ne-primary)] bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]'
        : 'border-[var(--ne-border)] text-[var(--ne-text-muted)] hover:border-[var(--ne-primary)] hover:text-[var(--ne-text)]',
      className
    )}
    {...props}
  />
);

export interface ChipListProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** A labelled, wrapping row of chips. */
export const ChipList: React.FC<ChipListProps> = ({
  label,
  children,
  className,
}) => (
  <ul
    aria-label={label}
    className={cn(
      'm-0 mt-1 flex list-none flex-wrap gap-1 p-0 ps-2.5',
      className
    )}
  >
    {children}
  </ul>
);
