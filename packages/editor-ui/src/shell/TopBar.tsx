import * as React from 'react';
import { Button } from '../primitives/Button';
import { cn } from '../lib/cn';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface TopBarProps {
  title: string;
  onTitleChange?: (title: string) => void;
  saveStatus?: SaveStatus;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  device?: 'desktop' | 'tablet' | 'mobile';
  onDeviceChange?: (device: 'desktop' | 'tablet' | 'mobile') => void;
  onPreview?: () => void;
  onPublish?: () => void;
  extra?: React.ReactNode;
  className?: string;
}

const saveStatusLabels: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  unsaved: 'Unsaved',
  error: 'Save failed',
};

export function TopBar({
  title,
  onTitleChange,
  saveStatus = 'saved',
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  device = 'desktop',
  onDeviceChange,
  onPreview,
  onPublish,
  extra,
  className,
}: TopBarProps) {
  return (
    <div className={cn('flex h-10 items-center justify-between gap-2 px-3', className)}>
      <div className="flex items-center gap-2">
        {onTitleChange ? (
          <input
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            className="h-7 w-48 rounded-[var(--ne-radius-sm)] border border-transparent bg-transparent px-1 text-sm font-medium text-[var(--ne-text)] focus:border-[var(--ne-border)] focus:outline-none"
          />
        ) : (
          <span className="text-sm font-medium text-[var(--ne-text)]">{title}</span>
        )}
        <span
          className={cn(
            'text-xs',
            saveStatus === 'saved' && 'text-[var(--ne-text-muted)]',
            saveStatus === 'saving' && 'text-[var(--ne-primary)]',
            saveStatus === 'unsaved' && 'text-[var(--ne-warning)]',
            saveStatus === 'error' && 'text-[var(--ne-danger)]'
          )}
        >
          {saveStatusLabels[saveStatus]}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {extra}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
            ↶
          </Button>
          <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
            ↷
          </Button>
        </div>
        {onDeviceChange && (
          <div className="flex items-center gap-0.5 rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-bg)] p-0.5">
            {(['desktop', 'tablet', 'mobile'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => onDeviceChange(d)}
                className={cn(
                  'rounded-[var(--ne-radius-sm)] px-2 py-0.5 text-xs transition-colors',
                  device === d
                    ? 'bg-[var(--ne-surface)] text-[var(--ne-text)] shadow-sm'
                    : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
                )}
              >
                {d === 'desktop' ? 'D' : d === 'tablet' ? 'T' : 'M'}
              </button>
            ))}
          </div>
        )}
        {onPreview && (
          <Button variant="outline" size="sm" onClick={onPreview}>
            Preview
          </Button>
        )}
        {onPublish && (
          <Button variant="default" size="sm" onClick={onPublish}>
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}