import {
  CornerLeftUp,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react';
import React from 'react';
import { cn } from '../lib/cn';
import { Tooltip } from '../primitives/Tooltip';

export interface PinnedBlockStripProps {
  blockName: string;
  blockType?: string;
  parentName?: string;
  onSelectParent?: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  isHidden?: boolean;
  onToggleHide?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const PinnedBlockStrip: React.FC<PinnedBlockStripProps> = ({
  blockName,
  blockType,
  parentName,
  onSelectParent,
  isLocked = false,
  onToggleLock,
  isHidden = false,
  onToggleHide,
  onDuplicate,
  onDelete,
  className,
}) => {
  return (
    <div
      role="region"
      aria-label={`Selected block: ${blockName}`}
      className={cn(
        'flex h-8 items-center justify-between gap-2 border-b border-[var(--ne-border)] bg-[var(--ne-surface)] px-2.5 text-xs select-none',
        className
      )}
    >
      {/* Left: Parent Nav & Block identity */}
      <div className="flex min-w-0 items-center gap-1.5 truncate">
        {onSelectParent && parentName && (
          <Tooltip content={`Select parent: ${parentName}`} side="bottom">
            <button
              type="button"
              onClick={onSelectParent}
              aria-label={`Select parent: ${parentName}`}
              className="flex h-5 items-center gap-1 rounded px-1 text-[11px] text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-colors"
            >
              <CornerLeftUp size={12} className="shrink-0" />
              <span className="truncate max-w-[80px]">{parentName}</span>
            </button>
          </Tooltip>
        )}

        <div className="flex items-center gap-1 truncate">
          <span className="font-semibold text-[var(--ne-text)] truncate">
            {blockName}
          </span>
          {blockType && (
            <span className="rounded bg-[var(--ne-surface-subtle)] px-1 py-0.2 text-[10px] font-mono text-[var(--ne-text-muted)] truncate">
              {blockType}
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {onToggleHide && (
          <Tooltip content={isHidden ? 'Show block' : 'Hide block'} side="bottom">
            <button
              type="button"
              aria-label={isHidden ? 'Show block' : 'Hide block'}
              aria-pressed={isHidden}
              onClick={onToggleHide}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-colors',
                isHidden && 'text-[var(--ne-warning)]'
              )}
            >
              {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </Tooltip>
        )}

        {onToggleLock && (
          <Tooltip content={isLocked ? 'Unlock block' : 'Lock block'} side="bottom">
            <button
              type="button"
              aria-label={isLocked ? 'Unlock block' : 'Lock block'}
              aria-pressed={isLocked}
              onClick={onToggleLock}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-colors',
                isLocked && 'text-[var(--ne-warning)]'
              )}
            >
              {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
          </Tooltip>
        )}

        {onDuplicate && (
          <Tooltip content="Duplicate block" side="bottom">
            <button
              type="button"
              aria-label="Duplicate block"
              onClick={onDuplicate}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-colors"
            >
              <Copy size={13} />
            </button>
          </Tooltip>
        )}

        {onDelete && (
          <Tooltip content="Delete block" side="bottom">
            <button
              type="button"
              aria-label="Delete block"
              onClick={onDelete}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-danger)] transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
