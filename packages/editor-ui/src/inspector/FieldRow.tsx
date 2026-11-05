import React, { useRef } from 'react';
import { flashValue } from '../lib/motion/play';
import { ChangedDot } from './ChangedDot';
import { type DeviceType, DeviceValueBadge } from './DeviceValueBadge';
import { ResetButton } from './ResetButton';

/** Label of the enclosing FieldRow, so nested controls can skip a duplicate header. */
const FieldRowLabelContext = React.createContext<string | null>(null);

/**
 * True when `label` repeats the enclosing FieldRow's label. Controls use it to
 * hide their own title and reset button, since the row already draws both.
 */
export function useIsFieldRowLabel(label?: string): boolean {
  const outer = React.useContext(FieldRowLabelContext);
  if (!outer || !label) return false;
  return outer.trim().toLowerCase() === label.trim().toLowerCase();
}

export interface FieldRowProps {
  label: string;
  description?: string;
  changed?: boolean;
  onReset?: () => void;
  device?: DeviceType;
  isInherited?: boolean;
  inheritedFrom?: DeviceType;
  /** Id of the control the label belongs to. */
  htmlFor?: string;
  layout?: 'horizontal' | 'vertical';
  children: React.ReactNode;
  className?: string;
  /** Extra props for the label, e.g. a scrub handler. */
  labelProps?: React.LabelHTMLAttributes<HTMLLabelElement>;
  /** Shown after the label, before the reset button (token chip, info). */
  adornment?: React.ReactNode;
  /** Shown under the control (helper or error text). */
  footer?: React.ReactNode;
  /** Validation error message shown below the field. */
  error?: React.ReactNode;
  /** Device badge click handler, e.g. to cycle devices. */
  onDeviceClick?: () => void;
}

export const FieldRow: React.FC<FieldRowProps> = ({
  label,
  description,
  changed = false,
  onReset,
  device,
  isInherited,
  inheritedFrom,
  htmlFor,
  layout = 'vertical',
  children,
  className = '',
  labelProps,
  adornment,
  footer,
  error,
  onDeviceClick,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  // The reset button disappears with the change, so the row itself flashes.
  const handleReset = onReset
    ? () => {
        flashValue(rowRef.current);
        onReset();
      }
    : undefined;
  const row = (
    <div
      ref={rowRef}
      className={`rounded-[var(--ne-radius-sm)] py-1.5 ${layout === 'horizontal' ? 'flex items-center justify-between gap-2 min-h-[32px]' : 'space-y-1'} ${footer ? '' : className}`}
    >
      <div
        className={`flex items-center gap-1.5 min-w-0 ${layout === 'horizontal' ? 'w-2/5 shrink-0' : 'w-full'}`}
      >
        <label
          htmlFor={htmlFor}
          title={description || label}
          {...labelProps}
          className={`text-xs font-medium text-[var(--ne-text)] truncate select-none font-sans ${labelProps?.className ?? ''}`}
        >
          {label}
        </label>
        <ChangedDot changed={changed} />
        {adornment}
        {device && (
          <DeviceValueBadge
            device={device}
            isInherited={isInherited}
            inheritedFrom={inheritedFrom}
            onClick={onDeviceClick}
          />
        )}
        {changed && handleReset && (
          <ResetButton onReset={handleReset} label={`Reset ${label}`} />
        )}
      </div>

      <div
        className={`${layout === 'horizontal' ? 'w-3/5 min-w-0' : 'w-full'}`}
      >
        <FieldRowLabelContext.Provider value={label}>
          {children}
        </FieldRowLabelContext.Provider>
      </div>
      {error && (
        // Keyed by message so each new error shakes once.
        <p
          key={typeof error === 'string' ? error : undefined}
          role="alert"
          className="ne-shake m-0 text-[11px] text-[var(--ne-danger,#ef4444)] font-medium"
        >
          {error}
        </p>
      )}
      {description && !error && layout === 'vertical' && (
        <p className="m-0 text-[11px] text-[var(--ne-text-muted)]">
          {description}
        </p>
      )}
    </div>
  );
  if (!footer) return row;
  return (
    <div className={className}>
      {row}
      {footer}
    </div>
  );
};
