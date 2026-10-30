import React from 'react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export interface DeviceValueBadgeProps {
  device: DeviceType;
  isInherited?: boolean;
  inheritedFrom?: DeviceType;
  onClick?: () => void;
  className?: string;
}

export const DeviceValueBadge: React.FC<DeviceValueBadgeProps> = ({
  device,
  isInherited = false,
  inheritedFrom = 'desktop',
  onClick,
  className = '',
}) => {
  const icon = {
    desktop: <Monitor className="w-2.5 h-2.5" />,
    tablet: <Tablet className="w-2.5 h-2.5" />,
    mobile: <Smartphone className="w-2.5 h-2.5" />,
  }[device];

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        isInherited
          ? `Inherited from ${inheritedFrom} breakpoint`
          : `Custom override for ${device}`
      }
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--ne-radius-sm)] text-[10px] font-mono leading-none transition-colors ${
        isInherited
          ? 'bg-[var(--ne-surface-subtle)] text-[var(--ne-text-subtle)] hover:text-[var(--ne-text-muted)] border border-dashed border-[var(--ne-border)]'
          : 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] font-medium border border-[var(--ne-primary)]/30'
      } ${className}`}
    >
      {icon}
      <span>{isInherited ? 'inherited' : device}</span>
    </button>
  );
};
