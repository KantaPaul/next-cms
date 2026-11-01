'use client';

import { Popover, ResetButton } from '@nextcms/editor-ui';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import { StateTabs } from '../primitives';

export interface GroupShellProps<T = any> {
  label: string;
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  exclude?: string[];
  defaults?: Partial<T>;
  popover?: boolean;
  states?: ('normal' | 'hover')[];
  children: (props: {
    value: any;
    onChange: (val: any) => void;
    exclude?: string[];
    defaults?: any;
    state?: 'normal' | 'hover';
  }) => ReactNode;
}

function isShallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function hasContent(val: any): boolean {
  if (val === undefined || val === null || val === '') return false;
  if (typeof val === 'object') {
    return Object.values(val).some(v => v !== undefined && v !== null && v !== '');
  }
  return true;
}

export function GroupShell<T = any>({
  label,
  value,
  onChange,
  exclude,
  defaults,
  popover = false,
  states,
  children,
}: GroupShellProps<T>) {
  const hasHoverState = Boolean(states && states.length > 1 && states.includes('hover'));

  // Separate normal and hover values when states are used
  const isStateContainer =
    hasHoverState &&
    value &&
    typeof value === 'object' &&
    ('normal' in (value as object) || 'hover' in (value as object));

  const rawNormal = isStateContainer
    ? (value as any)?.normal
    : value;
  const rawHover = isStateContainer
    ? (value as any)?.hover
    : undefined;

  // Merge defaults for the normal state
  const effectiveNormal =
    defaults && typeof defaults === 'object' && rawNormal && typeof rawNormal === 'object'
      ? { ...defaults, ...rawNormal }
      : (rawNormal ?? defaults);

  const effectiveHover = rawHover;

  const handleNormalChange = (nextNormal: any) => {
    if (!hasHoverState) {
      onChange(nextNormal);
      return;
    }
    if (rawHover !== undefined) {
      onChange({ normal: nextNormal, hover: rawHover } as any);
    } else {
      onChange(nextNormal !== undefined ? ({ normal: nextNormal } as any) : undefined);
    }
  };

  const handleHoverChange = (nextHover: any) => {
    const baseNormal = rawNormal ?? defaults;
    if (nextHover !== undefined || baseNormal !== undefined) {
      onChange({ normal: baseNormal, hover: nextHover } as any);
    } else {
      onChange(undefined);
    }
  };

  // Determine if group is modified / changed
  const isChanged = Boolean(
    value !== undefined &&
      (defaults ? !isShallowEqual(rawNormal, defaults) || hasContent(rawHover) : hasContent(value))
  );

  const renderContent = (state: 'normal' | 'hover' = 'normal') => {
    const isHover = state === 'hover';
    const val = isHover ? effectiveHover : effectiveNormal;
    const changeHandler = isHover ? handleHoverChange : handleNormalChange;

    return children({
      value: val,
      onChange: changeHandler,
      exclude,
      defaults: isHover ? undefined : defaults,
      state,
    });
  };

  const content = hasHoverState ? (
    <StateTabs
      normal={renderContent('normal')}
      hover={renderContent('hover')}
    />
  ) : (
    renderContent('normal')
  );

  if (popover) {
    return (
      <div className="flex min-h-6 items-center justify-between gap-2">
        <Label className="text-xs font-medium text-steel-600">{label}</Label>
        <div className="flex items-center gap-1.5">
          {isChanged && (
            <span
              className="size-1.5 rounded-full bg-blue-500"
              title="Modified"
              data-testid="group-changed-dot"
            />
          )}
          <ResetButton
            onReset={() => onChange(undefined)}
            label={`Reset ${label}`}
            disabled={!isChanged}
          />
          <Popover
            trigger={
              <button
                type="button"
                aria-label={`Edit ${label}`}
                className={cn(
                  'inline-flex size-6 items-center justify-center rounded border border-steel-200 bg-white text-steel-500 hover:text-steel-800 transition shadow-xs',
                  isChanged && 'border-blue-400 text-blue-600 bg-blue-50/50'
                )}
              >
                <Pencil className="size-3" />
              </button>
            }
            content={() => (
              <div className="w-72 max-w-[90vw] p-1 space-y-3">
                <div className="font-medium text-xs text-steel-700 pb-1 border-b border-steel-100">
                  {label}
                </div>
                {content}
              </div>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label className="text-xs font-medium text-steel-600">{label}</Label>
        <div className="flex items-center gap-1.5">
          {isChanged && (
            <span
              className="size-1.5 rounded-full bg-blue-500"
              title="Modified"
              data-testid="group-changed-dot"
            />
          )}
          <ResetButton
            onReset={() => onChange(undefined)}
            label={`Reset ${label}`}
            disabled={!isChanged}
          />
        </div>
      </div>
      {content}
    </div>
  );
}
