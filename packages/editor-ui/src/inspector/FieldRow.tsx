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
  layout?: 'horizontal' | 'vertical';
  children: React.ReactNode;
  className?: string;
}

export const FieldRow: React.FC<FieldRowProps> = ({
  label,
  description,
  changed = false,
  onReset,
  device,
  isInherited,
  layout = 'horizontal',
  children,
  className = '',
}) => {
  return (
    <div className={`py-1.5 ${layout === 'horizontal' ? 'flex items-center justify-between gap-2 min-h-[32px]' : 'space-y-1'} ${className}`}>
      <div className={`flex items-center gap-1.5 min-w-0 ${layout === 'horizontal' ? 'w-2/5 shrink-0' : 'w-full'}`}>
        <ChangedDot changed={changed} />
        <label className="text-xs font-medium text-[var(--ne-text)] truncate select-none font-sans" title={description || label}>
          {label}
        </label>
        {device && (
          <DeviceValueBadge device={device} isInherited={isInherited} />
        )}
        {changed && onReset && (
          <ResetButton onReset={onReset} />
        )}
      </div>

      <div className={`${layout === 'horizontal' ? 'w-3/5 min-w-0' : 'w-full'}`}>
        {children}
      </div>
    </div>
  );
};
