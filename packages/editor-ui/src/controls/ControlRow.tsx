import { CircleAlert, Info } from 'lucide-react';
import React from 'react';
import type { DeviceType } from '../inspector/DeviceValueBadge';
import { FieldRow } from '../inspector/FieldRow';
import { Tooltip } from '../primitives/Tooltip';
import { TokenChip } from './TokenChip';

/** Which device is being edited, and whether this field overrides it. */
export interface ControlDeviceState {
  device: DeviceType;
  overridden: boolean;
  inheritedFrom?: DeviceType;
  onCycle?: () => void;
}

export interface ControlRowProps {
  label: string;
  /** Id of the control the label belongs to. */
  htmlFor?: string;
  /** Short controls sit beside the label; long ones go under it. */
  labelPosition?: 'left' | 'above';
  info?: string;
  changed?: boolean;
  onReset?: () => void;
  /** Name of the site token the value is linked to. */
  tokenName?: string;
  /** Callback when the token chip's clear button is clicked. */
  onClearToken?: () => void;
  deviceState?: ControlDeviceState;
  helperText?: string;
  errorText?: string;
  /** Makes the label a scrub handle (see useScrub). */
  onLabelPointerDown?: (e: React.PointerEvent<HTMLLabelElement>) => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Shared frame for every E12 control: label, info tooltip, changed dot,
 * token chip, device chip, reset, and helper or error text. Built on the
 * inspector FieldRow so both look the same.
 */
export const ControlRow: React.FC<ControlRowProps> = ({
  label,
  htmlFor,
  labelPosition = 'left',
  info,
  changed,
  onReset,
  tokenName,
  onClearToken,
  deviceState,
  helperText,
  errorText,
  onLabelPointerDown,
  className,
  children,
}) => {
  const messageId = htmlFor ? `${htmlFor}-message` : undefined;
  const adornment =
    info || tokenName ? (
      <>
        {info && (
          <Tooltip content={info}>
            <button
              type="button"
              aria-label={info}
              className="inline-flex shrink-0 cursor-help rounded-full text-[var(--ne-text-subtle)] hover:text-[var(--ne-text-muted)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]"
            >
              <Info className="h-3 w-3" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
        {tokenName && (
          <TokenChip tokenName={tokenName} onClear={onClearToken} />
        )}
      </>
    ) : undefined;

  const footer = errorText ? (
    <p
      id={messageId}
      role="alert"
      className="m-0 flex items-center gap-1 pb-1 text-[11px] font-medium text-[var(--ne-danger)]"
    >
      <CircleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
      {errorText}
    </p>
  ) : helperText ? (
    <p
      id={messageId}
      className="m-0 pb-1 text-[11px] text-[var(--ne-text-muted)]"
    >
      {helperText}
    </p>
  ) : undefined;

  return (
    <FieldRow
      label={label}
      htmlFor={htmlFor}
      layout={labelPosition === 'left' ? 'horizontal' : 'vertical'}
      changed={changed}
      onReset={onReset}
      device={deviceState?.device}
      isInherited={deviceState ? !deviceState.overridden : undefined}
      inheritedFrom={deviceState?.inheritedFrom}
      onDeviceClick={deviceState?.onCycle}
      adornment={adornment}
      footer={footer}
      labelProps={
        onLabelPointerDown
          ? {
              onPointerDown: onLabelPointerDown,
              className:
                'cursor-ew-resize touch-none hover:text-[var(--ne-primary)]',
              title: `Drag to change ${label}. Shift: faster, Alt: slower.`,
            }
          : undefined
      }
      className={className}
    >
      {children}
    </FieldRow>
  );
};

/** aria-describedby for the control inside a ControlRow. */
export const controlMessageId = (
  id: string,
  { helperText, errorText }: { helperText?: string; errorText?: string }
): string | undefined =>
  helperText || errorText ? `${id}-message` : undefined;
