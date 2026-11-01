import React from 'react';
import { ChangedDot } from './ChangedDot';
import { ResetButton } from './ResetButton';
import { DeviceValueBadge, DeviceType } from './DeviceValueBadge';

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
  layout = 'horizontal',
  children,
  className = '',
  labelProps,
  adornment,
  footer,
  onDeviceClick,
}) => {
  const row = (
    <div
      className={`py-1.5 ${layout === 'horizontal' ? 'flex items-center justify-between gap-2 min-h-[32px]' : 'space-y-1'} ${footer ? '' : className}`}
    >
      <div
        className={`flex items-center gap-1.5 min-w-0 ${layout === 'horizontal' ? 'w-2/5 shrink-0' : 'w-full'}`}
      >
        <ChangedDot changed={changed} />
        <label
          title={description || label}
          {...labelProps}
          htmlFor={htmlFor}
          className={`text-xs font-medium text-[var(--ne-text)] truncate select-none font-sans ${labelProps?.className ?? ''}`}
        >
          {label}
        </label>
        {adornment}
        {device && (
          <DeviceValueBadge
            device={device}
            isInherited={isInherited}
            inheritedFrom={inheritedFrom}
            onClick={onDeviceClick}
          />
        )}
        {changed && onReset && (
          <ResetButton onReset={onReset} label={`Reset ${label}`} />
        )}
      </div>

      <div
        className={`${layout === 'horizontal' ? 'w-3/5 min-w-0' : 'w-full'}`}
      >
        {children}
      </div>
      {description && layout === 'vertical' && (
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
