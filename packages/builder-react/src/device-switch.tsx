/**
 * Desktop, tablet, and mobile buttons; switches the canvas and per-device fields.
 */

import { DEVICES, type Device } from '@nextcms/builder-core';
import {
  IconButton,
  SlidingIndicator,
  useSlidingIndicator,
} from '@nextcms/editor-ui';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import type { CSSProperties } from 'react';
import React, { useRef } from 'react';
import { useEditor, useEditorStore } from './context';

const DEVICE_ICONS: Record<Device, typeof Monitor> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

export function DeviceSwitch({ style }: { style?: CSSProperties }) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  const groupRef = useRef<HTMLFieldSetElement>(null);
  useSlidingIndicator(groupRef, device);
  return (
    <fieldset
      ref={groupRef}
      aria-label="Edit for device"
      style={
        {
          position: 'relative',
          display: 'inline-flex',
          gap: 2,
          border: 0,
          margin: 0,
          padding: 0,
          '--ne-ind-bg': 'var(--ne-primary-soft)',
          '--ne-ind-shadow': 'none',
          ...style,
        } as CSSProperties
      }
    >
      <SlidingIndicator />
      {DEVICES.map(d => {
        const Icon = DEVICE_ICONS[d];
        const label = d[0].toUpperCase() + d.slice(1);
        return (
          <IconButton
            key={d}
            size="sm"
            // The sliding indicator draws the active background.
            style={device === d ? { color: 'var(--ne-primary)' } : undefined}
            data-ne-active={device === d ? 'true' : undefined}
            aria-pressed={device === d}
            aria-label={label}
            tooltip={label}
            onClick={() => store.setDevice(d)}
          >
            <Icon style={{ width: 14, height: 14 }} />
          </IconButton>
        );
      })}
    </fieldset>
  );
}
