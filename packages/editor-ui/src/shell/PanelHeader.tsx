import { ArrowLeft, ChevronLeft } from 'lucide-react';
import React from 'react';
import { cn } from '../lib/cn';

export interface PanelHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  /** Back button handler when navigating inside a stack. */
  onBack?: () => void;
  backLabel?: string;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  subtitle,
  icon,
  onBack,
  backLabel = 'Back',
  breadcrumbs,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex h-9 shrink-0 items-center justify-between gap-2 border-b border-[var(--ne-border)] bg-[var(--ne-surface)] px-3 select-none',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            title={backLabel}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--ne-radius-sm)] text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]"
          >
            <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        )}

        {breadcrumbs ? (
          <div className="min-w-0 flex-1">{breadcrumbs}</div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {icon && (
              <span className="shrink-0 text-[var(--ne-text-muted)] flex items-center">
                {icon}
              </span>
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold text-[var(--ne-text)]">
                {title}
              </span>
              {subtitle && (
                <span className="truncate text-[10px] text-[var(--ne-text-muted)]">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
};
