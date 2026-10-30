import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Move,
  MoreHorizontal,
  BoxSelect,
} from 'lucide-react';
import { IconButton } from '../primitives/IconButton';

export interface FloatingToolbarProps {
  top: number;
  left: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToggleLock?: () => void;
  onEnterMoveMode?: () => void;
  isLocked?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  top,
  left,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onToggleLock,
  onEnterMoveMode,
  isLocked = false,
  canMoveUp = true,
  canMoveDown = true,
  className = '',
}) => {
  return (
    <div
      style={{
        top: `${Math.max(10, top - 36)}px`,
        left: `${left}px`,
      }}
      className={`absolute z-40 flex items-center gap-0.5 p-1 bg-[var(--ne-surface)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] shadow-md ne-motion-enter-up ${className}`}
    >
      {onEnterMoveMode && !isLocked && (
        <IconButton
          size="sm"
          tooltip="Move (Enter to move with arrow keys)"
          onClick={onEnterMoveMode}
        >
          <Move className="w-3.5 h-3.5" />
        </IconButton>
      )}

      {onMoveUp && !isLocked && (
        <IconButton
          size="sm"
          disabled={!canMoveUp}
          tooltip="Move up (Alt+Up)"
          onClick={onMoveUp}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </IconButton>
      )}

      {onMoveDown && !isLocked && (
        <IconButton
          size="sm"
          disabled={!canMoveDown}
          tooltip="Move down (Alt+Down)"
          onClick={onMoveDown}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </IconButton>
      )}

      <div className="w-[1px] h-3.5 bg-[var(--ne-border)] mx-0.5" />

      {onDuplicate && !isLocked && (
        <IconButton size="sm" tooltip="Duplicate (Cmd+D)" onClick={onDuplicate}>
          <Copy className="w-3.5 h-3.5" />
        </IconButton>
      )}

      {onToggleLock && (
        <IconButton
          size="sm"
          tooltip={isLocked ? 'Unlock component' : 'Lock component'}
          onClick={onToggleLock}
          className={isLocked ? 'text-[var(--ne-warning)]' : ''}
        >
          {isLocked ? (
            <Lock className="w-3.5 h-3.5" />
          ) : (
            <Unlock className="w-3.5 h-3.5" />
          )}
        </IconButton>
      )}

      {onDelete && !isLocked && (
        <IconButton
          size="sm"
          variant="danger"
          tooltip="Delete (Del / Backspace)"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </IconButton>
      )}
    </div>
  );
};
