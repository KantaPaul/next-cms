import React from 'react';
import { Check, Loader2, CloudOff, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'offline' | 'conflict' | 'failed';

export interface SaveStatusProps {
  status: SaveState;
  lastSavedAt?: string | Date;
  onRetry?: () => void;
  onResolveConflict?: () => void;
  className?: string;
}

export const SaveStatus: React.FC<SaveStatusProps> = ({
  status,
  lastSavedAt,
  onRetry,
  onResolveConflict,
  className = '',
}) => {
  const formattedTime = lastSavedAt
    ? typeof lastSavedAt === 'string'
      ? lastSavedAt
      : lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  switch (status) {
    case 'saving':
      return (
        <div className={`inline-flex items-center gap-1.5 text-xs text-[var(--ne-text-muted)] ${className}`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--ne-primary)]" />
          <span>Saving...</span>
        </div>
      );
    case 'unsaved':
      return (
        <div className={`inline-flex items-center gap-1.5 text-xs text-[var(--ne-warning)] ${className}`}>
          <span className="w-2 h-2 rounded-full bg-[var(--ne-warning)]" />
          <span>Unsaved changes</span>
        </div>
      );
    case 'offline':
      return (
        <div className={`inline-flex items-center gap-1.5 text-xs text-[var(--ne-text-muted)] ${className}`}>
          <CloudOff className="w-3.5 h-3.5 text-[var(--ne-text-muted)]" />
          <span>Offline (cached locally)</span>
        </div>
      );
    case 'conflict':
      return (
        <button
          type="button"
          onClick={onResolveConflict}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--ne-radius-sm)] bg-[var(--ne-danger-soft)] text-xs font-medium text-[var(--ne-danger)] cursor-pointer hover:underline ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Version Conflict</span>
        </button>
      );
    case 'failed':
      return (
        <div className={`inline-flex items-center gap-1.5 text-xs text-[var(--ne-danger)] ${className}`}>
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Save failed</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="underline text-[11px] font-medium hover:opacity-80 cursor-pointer ml-1"
            >
              Retry
            </button>
          )}
        </div>
      );
    case 'saved':
    default:
      return (
        <div className={`inline-flex items-center gap-1.5 text-xs text-[var(--ne-text-muted)] ${className}`}>
          <Check className="w-3.5 h-3.5 text-[var(--ne-success)]" />
          <span>Saved {formattedTime ? `at ${formattedTime}` : ''}</span>
        </div>
      );
  }
};
