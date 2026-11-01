import { Sparkles, X } from 'lucide-react';
import React from 'react';
import { cn } from '../lib/cn';

export interface TokenChipProps {
  tokenName: string;
  onClear?: () => void;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const TokenChip: React.FC<TokenChipProps> = ({
  tokenName,
  onClear,
  onClick,
  className,
  size = 'sm',
}) => {
  return (
    <span
      title={`Linked to token ${tokenName}`}
      onClick={onClick}
      className={cn(
        'inline-flex min-w-0 shrink items-center gap-1 rounded-[var(--ne-radius-sm)] border border-[var(--ne-primary)]/30 bg-[var(--ne-primary-soft)] font-mono text-[var(--ne-primary)] select-none',
        size === 'sm'
          ? 'px-1.5 py-0.5 text-[10px] leading-none'
          : 'px-2 py-1 text-xs',
        onClick && 'cursor-pointer hover:border-[var(--ne-primary)]',
        className
      )}
    >
      <Sparkles className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{tokenName}</span>
      {onClear && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onClear();
          }}
          aria-label={`Clear token ${tokenName}`}
          className="ms-0.5 rounded p-0.5 hover:bg-[var(--ne-primary)]/20 hover:text-[var(--ne-primary)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]"
        >
          <X className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
        </button>
      )}
    </span>
  );
};
