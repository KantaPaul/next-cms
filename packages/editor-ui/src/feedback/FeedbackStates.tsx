import * as React from 'react';
import { Button } from '../primitives/Button';
import { cn } from '../lib/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 p-6 text-center', className)}>
      {icon && <div className="text-[var(--ne-text-muted)]">{icon}</div>}
      <h3 className="text-sm font-medium text-[var(--ne-text)]">{title}</h3>
      {description && <p className="text-xs text-[var(--ne-text-muted)]">{description}</p>}
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 p-6 text-center', className)}>
      <div className="text-[var(--ne-danger)]">⚠</div>
      <h3 className="text-sm font-medium text-[var(--ne-text)]">{title}</h3>
      <p className="text-xs text-[var(--ne-text-muted)]">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-2 p-4', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[var(--ne-radius-sm)] bg-[var(--ne-border)]"
          style={{ height: 12, width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}