import React from 'react';
import { AlertCircle, AlertTriangle, Check, CloudOff } from 'lucide-react';

export type SaveState =
  | 'saved'
  | 'saving'
  | 'unsaved'
  | 'offline'
  | 'conflict'
  | 'failed';

export interface SaveStatusProps {
  status: SaveState;
  lastSavedAt?: string | Date;
  onRetry?: () => void;
  onResolveConflict?: () => void;
  className?: string;
}

const SaveStatusContent: React.FC<SaveStatusProps> = ({
  status,
  lastSavedAt,
  onRetry,
  onResolveConflict,
  className = '',
}) => {
  const formattedTime = lastSavedAt
    ? typeof lastSavedAt === 'string'
      ? lastSavedAt
      : lastSavedAt.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
    : '';

  switch (status) {
    case 'saving':
      return (
        <div
          className={`inline-flex items-center gap-1.5 text-xs text-[var(--ne-text-muted)] ${className}`}
        >
          <span aria-hidden className="ne-save-pulse" />
          <span className="ne-motion-enter-up">Saving…</span>
        </div>
      );
    case 'unsaved':
      return (
        <div
          className={`inline-flex items-center gap-1.5 text-xs text-[var(--ne-warning)] ${className}`}
        >
          <span className="ne-motion-pop-in w-2 h-2 rounded-full bg-[var(--ne-warning)]" />
          <span className="ne-motion-enter-up">Unsaved changes</span>
        </div>
      );
    case 'offline':
      return (
        <div
          className={`inline-flex items-center gap-1.5 text-xs text-[var(--ne-text-muted)] ${className}`}
        >
          <CloudOff className="ne-motion-pop-in w-3.5 h-3.5 text-[var(--ne-text-muted)]" />
          <span>Offline (cached locally)</span>
        </div>
      );
    case 'conflict':
      return (
        <button
          type="button"
          onClick={onResolveConflict}
          className={`ne-press inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--ne-radius-sm)] bg-[var(--ne-danger-soft)] text-xs font-medium text-[var(--ne-danger)] cursor-pointer hover:underline ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Version Conflict</span>
        </button>
      );
    case 'failed':
      return (
        <div
          className={`inline-flex items-center gap-1.5 text-xs text-[var(--ne-danger)] ne-shake ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Save failed</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ne-press underline text-[11px] font-medium hover:opacity-80 cursor-pointer ml-1"
            >
              Retry
            </button>
          )}
        </div>
      );
    case 'saved':
    default:
      return (
        <div
          className={`inline-flex items-center gap-1.5 text-xs text-[var(--ne-text-muted)] ${className}`}
        >
          <Check
            aria-hidden
            className="w-3.5 h-3.5 text-[var(--ne-success)] ne-check-draw"
          />
          <span className="ne-motion-enter-up">Saved</span>
          {formattedTime && (
            // Keyed so a new time crossfades in instead of swapping.
            <span key={formattedTime} className="ne-motion-enter">
              at {formattedTime}
            </span>
          )}
        </div>
      );
  }
};

/**
 * Save state indicator. Each state remounts (keyed), so its entry motion
 * replays: a pulse while saving, a check that draws in when saved, a shake
 * on failure (B15 E2b).
 */
export const SaveStatus: React.FC<SaveStatusProps> = props => (
  <span
    key={props.status}
    role="status"
    aria-live="polite"
    className="ne-motion-enter inline-flex"
  >
    <SaveStatusContent {...props} />
  </span>
);
