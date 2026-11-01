import * as Collapsible from '@radix-ui/react-collapsible';
import {
  ChevronRight,
  Copy,
  MoreHorizontal,
  RotateCcw,
} from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { Menu } from '../primitives/Menu';
import { Switch } from '../primitives/Switch';

export type ControlState = 'normal' | 'hover' | 'focus';

export interface GroupPreset {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface GroupControlProps {
  id?: string;
  title: string;
  icon?: React.ReactNode;
  summary?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Number of modified fields in this group. */
  changedCount?: number;
  /** Reset all modified fields in this group. */
  onReset?: () => void;
  /** Copy group style values. */
  onCopy?: () => void;
  /** Paste group style values. */
  onPaste?: () => void;
  canPaste?: boolean;
  /** Active pseudo-class state being edited. */
  state?: ControlState;
  /** Callback when switching pseudo-class state. */
  onStateChange?: (state: ControlState) => void;
  /** Available pseudo-class states (defaults to ['normal', 'hover', 'focus']). */
  states?: readonly ControlState[] | ControlState[];
  /** Optional style presets. */
  presets?: readonly GroupPreset[] | GroupPreset[];
  /** Callback when a preset is selected. */
  onSelectPreset?: (preset: GroupPreset) => void;
  /** Optional enable/disable switch for the entire group. */
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  className?: string;
  children: React.ReactNode;
}

const DEFAULT_STATES: ControlState[] = ['normal', 'hover', 'focus'];

export const GroupControl: React.FC<GroupControlProps> = ({
  id,
  title,
  icon,
  summary,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  changedCount = 0,
  onReset,
  onCopy,
  onPaste,
  canPaste = true,
  state: activeState,
  onStateChange,
  states = DEFAULT_STATES,
  presets,
  onSelectPreset,
  enabled,
  onEnabledChange,
  className,
  children,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ?? internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };

  const hasMenuActions = Boolean(onCopy || onPaste);

  return (
    <Collapsible.Root
      id={id}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        'rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] transition-colors',
        isOpen ? 'border-[var(--ne-border-strong)]' : 'hover:border-[var(--ne-border-strong)]',
        className
      )}
    >
      {/* Summary Header Row */}
      <div className="flex select-none items-center justify-between gap-2 px-3 py-2 text-xs">
        <Collapsible.Trigger
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left font-semibold text-[var(--ne-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)]"
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-[var(--ne-text-muted)] transition-transform duration-[var(--ne-duration-fast)]',
              isOpen ? 'rotate-90' : 'rtl:-scale-x-100'
            )}
            aria-hidden="true"
          />
          {icon && (
            <span className="shrink-0 text-[var(--ne-text-muted)]" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="truncate">{title}</span>

          {/* Changed Count Badge */}
          {changedCount > 0 && (
            <span
              title={`${changedCount} modified properties`}
              aria-label={`${changedCount} modified`}
              className="inline-flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-[var(--ne-primary)] px-1 font-mono text-[9px] font-bold leading-none text-white shadow-2xs"
            >
              {changedCount}
            </span>
          )}

          {/* Collapsed Summary Text */}
          {!isOpen && summary && (
            <span className="ms-auto truncate font-mono text-[11px] font-normal text-[var(--ne-text-muted)] pe-1">
              {summary}
            </span>
          )}
        </Collapsible.Trigger>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-1">
          {enabled !== undefined && onEnabledChange && (
            <Switch
              checked={enabled}
              onChange={val => onEnabledChange(Boolean(val))}
              aria-label={`Enable ${title}`}
            />
          )}

          {changedCount > 0 && onReset && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onReset();
              }}
              title={`Reset ${title} group`}
              aria-label={`Reset ${title} group`}
              className="rounded-[var(--ne-radius-xs)] p-1 text-[var(--ne-text-muted)] transition-colors hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
            </button>
          )}

          {hasMenuActions && (
            <Menu
              trigger={
                <button
                  type="button"
                  title="Group options"
                  aria-label={`${title} options`}
                  className="rounded-[var(--ne-radius-xs)] p-1 text-[var(--ne-text-muted)] transition-colors hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)]"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              }
              items={[
                ...(onCopy
                  ? [
                      {
                        id: 'copy',
                        label: `Copy ${title}`,
                        icon: <Copy className="h-3.5 w-3.5" />,
                        onClick: onCopy,
                      },
                    ]
                  : []),
                ...(onPaste
                  ? [
                      {
                        id: 'paste',
                        label: `Paste ${title}`,
                        disabled: !canPaste,
                        onClick: onPaste,
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </div>
      </div>

      {/* Inline Collapsible Drawer */}
      <Collapsible.Content className="ne-motion-collapse">
        <div className="border-t border-[var(--ne-border)] px-3 py-2.5 space-y-3">
          {/* Normal / Hover / Focus State Chips */}
          {onStateChange && activeState && states.length > 0 && (
            <div
              role="radiogroup"
              aria-label={`${title} state`}
              className="inline-flex w-full items-center rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-0.5 gap-0.5"
            >
              {states.map(s => {
                const isSelected = s === activeState;
                const label = s.charAt(0).toUpperCase() + s.slice(1);
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => onStateChange(s)}
                    className={cn(
                      'flex-1 rounded-[var(--ne-radius-xs)] py-0.5 text-center text-[10px] font-medium uppercase tracking-wider transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)]',
                      isSelected
                        ? 'bg-[var(--ne-surface)] font-semibold text-[var(--ne-primary)] shadow-xs'
                        : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Presets Row */}
          {presets && presets.length > 0 && onSelectPreset && (
            <div
              role="group"
              aria-label={`${title} presets`}
              className="flex items-center gap-1.5 overflow-x-auto pb-1 ne-scrollbar"
            >
              {presets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-[var(--ne-radius-sm)] border px-2 py-0.5 text-[10px] font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)]',
                    preset.active
                      ? 'border-[var(--ne-primary)] bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] font-semibold'
                      : 'border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] text-[var(--ne-text-muted)] hover:border-[var(--ne-border-strong)] hover:text-[var(--ne-text)]'
                  )}
                >
                  {preset.icon && (
                    <span className="shrink-0" aria-hidden="true">
                      {preset.icon}
                    </span>
                  )}
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Group Content Controls */}
          <div className="space-y-2">{children}</div>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
