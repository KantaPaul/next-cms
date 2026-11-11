import React from 'react';
import { type Device, DEVICE_LABELS } from '@nextcms/builder-core';
import {
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  TabletSmartphone,
  Tv,
} from 'lucide-react';

export type DeviceType = Device;

export const DEVICE_ICON_MAP: Record<DeviceType, typeof Monitor> = {
  widescreen: Tv,
  desktop: Monitor,
  laptop: Laptop,
  tablet_extra: TabletSmartphone,
  tablet: Tablet,
  mobile_extra: TabletSmartphone,
  mobile: Smartphone,
};

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
  const Icon = DEVICE_ICON_MAP[device] ?? Monitor;
  const deviceLabel = DEVICE_LABELS[device] ?? device;
  const inheritedLabel = DEVICE_LABELS[inheritedFrom] ?? inheritedFrom;

  // A button only when it does something; otherwise a plain label.
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      title={
        isInherited
          ? `Inherited from ${inheritedLabel} breakpoint`
          : `Custom override for ${deviceLabel}`
      }
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--ne-radius-sm)] text-[10px] font-mono leading-none transition-colors ${
        isInherited
          ? 'bg-[var(--ne-surface-subtle)] text-[var(--ne-text-subtle)] hover:text-[var(--ne-text-muted)] border border-dashed border-[var(--ne-border)]'
          : 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] font-medium border border-[var(--ne-primary)]/30'
      } ${className}`}
    >
      <Icon className="w-2.5 h-2.5" />
      <span>
        {isInherited
          ? `from ${inheritedLabel.toLowerCase()}`
          : deviceLabel.toLowerCase()}
      </span>
    </Tag>
  );
};
