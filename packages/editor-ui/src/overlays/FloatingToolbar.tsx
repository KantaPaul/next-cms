import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Lock,
  Move,
  Trash2,
  Unlock,
} from 'lucide-react';
import type React from 'react';
import { cn } from '../lib/cn';
import { IconButton } from '../primitives/IconButton';

/** One button on a floating toolbar. */
export interface ToolbarAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Shown in the tooltip, e.g. "⌘D". */
  shortcut?: string;
}

export interface FloatingToolbarProps {
  /** Top of the target box (generic mode) or of the toolbar's anchor (legacy). */
  top: number;
  left: number;
  /** Generic mode (B15 E5): a name, a drag handle, and any actions. */
  label?: string;
  actions?: ToolbarAction[];
  dragHandle?: {
    label: string;
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  };
  /** Above the target when there is room, else inside its top edge. */
  placement?: 'above' | 'below';
  tone?: 'default' | 'locked';
  /** Accessible name for the toolbar; defaults to "<label> actions". */
  ariaLabel?: string;
  // Legacy fixed buttons, kept for existing callers.
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

const ICON = 'h-3.5 w-3.5';

/** The fixed buttons of the original toolbar, as actions. */
function legacyActions(props: FloatingToolbarProps): ToolbarAction[] {
  const locked = !!props.isLocked;
  const list: (ToolbarAction | false | undefined)[] = [
    !locked &&
      props.onEnterMoveMode && {
        id: 'move',
        label: 'Move (Enter to move with arrow keys)',
        icon: <Move className={ICON} />,
        onClick: props.onEnterMoveMode,
      },
    !locked &&
      props.onMoveUp && {
        id: 'up',
        label: 'Move up',
        shortcut: 'Alt+↑',
        icon: <ChevronUp className={ICON} />,
        onClick: props.onMoveUp,
        disabled: props.canMoveUp === false,
      },
    !locked &&
      props.onMoveDown && {
        id: 'down',
        label: 'Move down',
        shortcut: 'Alt+↓',
        icon: <ChevronDown className={ICON} />,
        onClick: props.onMoveDown,
        disabled: props.canMoveDown === false,
      },
    !locked &&
      props.onDuplicate && {
        id: 'duplicate',
        label: 'Duplicate',
        shortcut: '⌘D',
        icon: <Copy className={ICON} />,
        onClick: props.onDuplicate,
      },
    props.onToggleLock && {
      id: 'lock',
      label: locked ? 'Unlock' : 'Lock',
      icon: locked ? <Lock className={ICON} /> : <Unlock className={ICON} />,
      onClick: props.onToggleLock,
    },
    !locked &&
      props.onDelete && {
        id: 'delete',
        label: 'Delete',
        shortcut: 'Del',
        icon: <Trash2 className={ICON} />,
        onClick: props.onDelete,
        danger: true,
      },
  ];
  return list.filter((a): a is ToolbarAction => !!a);
}

/** Arrow keys move between the toolbar's buttons (WAI-ARIA toolbar). */
function onToolbarKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  const step =
    event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (!step && event.key !== 'Home' && event.key !== 'End') return;
  const buttons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      'button:not([disabled])'
    ),
  ];
  if (!buttons.length) return;
  event.preventDefault();
  const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (index + (rtl ? -step : step) + buttons.length) % buttons.length;
  buttons[next]?.focus();
}

/**
 * Toolbar that floats over the selected item (B15 E5). Generic mode takes a
 * label, an optional drag handle and any actions; the original fixed-button
 * props still work. Arrow keys move between buttons; it slides in on show.
 */
export const FloatingToolbar: React.FC<FloatingToolbarProps> = props => {
  const {
    top,
    left,
    label,
    actions,
    dragHandle,
    placement = 'above',
    tone = 'default',
    ariaLabel,
    className,
  } = props;
  const generic = actions !== undefined || label !== undefined;
  const items = actions ?? legacyActions(props);
  const y = generic
    ? placement === 'above'
      ? top - 32
      : top + 4
    : Math.max(10, top - 36);
  const locked = tone === 'locked' || !!props.isLocked;

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel ?? (label ? `${label} actions` : 'Actions')}
      onKeyDown={onToolbarKeyDown}
      style={{ top: y, left }}
      className={cn(
        'ne-motion-enter-up pointer-events-auto absolute z-40 flex items-center gap-0.5 rounded-[var(--ne-radius-md)] border bg-[var(--ne-surface)] p-0.5 shadow-md',
        locked ? 'border-[var(--ne-locked)]' : 'border-[var(--ne-border)]',
        className
      )}
    >
      {dragHandle && (
        <IconButton
          size="sm"
          tooltip={dragHandle.label}
          onPointerDown={dragHandle.onPointerDown}
          className="cursor-grab touch-none active:cursor-grabbing"
        >
          <GripVertical className={ICON} />
        </IconButton>
      )}
      {label && (
        <span
          className={cn(
            'flex max-w-[160px] items-center gap-1 truncate px-1.5 text-[11px] font-semibold',
            locked ? 'text-[var(--ne-locked)]' : 'text-[var(--ne-text)]'
          )}
        >
          {locked && <Lock aria-hidden className="h-3 w-3 shrink-0" />}
          <span className="truncate">{label}</span>
        </span>
      )}
      {(dragHandle || label) && items.length > 0 && (
        <span aria-hidden className="mx-0.5 h-3.5 w-px bg-[var(--ne-border)]" />
      )}
      {items.map(action => (
        <IconButton
          key={action.id}
          size="sm"
          variant={action.danger ? 'danger' : 'ghost'}
          disabled={action.disabled}
          aria-label={action.label}
          tooltip={
            action.shortcut
              ? `${action.label} (${action.shortcut})`
              : action.label
          }
          onClick={action.onClick}
        >
          {action.icon}
        </IconButton>
      ))}
    </div>
  );
};
