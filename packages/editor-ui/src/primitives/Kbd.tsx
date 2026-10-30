import React from 'react';

export interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export const Kbd: React.FC<KbdProps> = ({ children, className = '' }) => {
  return (
    <kbd
      className={`inline-flex items-center justify-center font-mono text-[10px] font-medium px-1.5 py-0.5 min-w-[18px] bg-[var(--ne-surface-subtle)] text-[var(--ne-text-muted)] border border-[var(--ne-border)] rounded-[var(--ne-radius-sm)] shadow-2xs select-none ${className}`}
    >
      {children}
    </kbd>
  );
};
