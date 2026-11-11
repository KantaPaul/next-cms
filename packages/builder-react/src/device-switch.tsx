/**
 * Enabled device buttons; switches the canvas and per-device fields.
 */

import {
  DEFAULT_BREAKPOINTS,
  type Device,
  enabledDevices,
} from '@nextcms/builder-core';
import {
  DEVICE_ICON_MAP,
  IconButton,
  SlidingIndicator,
  useSlidingIndicator,
} from '@nextcms/editor-ui';
import { Monitor } from 'lucide-react';
import type { CSSProperties } from 'react';
import React, { useRef } from 'react';
import { useEditor, useEditorStore } from './context';

export function DeviceSwitch({ style }: { style?: CSSProperties }) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  const breakpoints = useEditor(state => state.breakpoints) ?? DEFAULT_BREAKPOINTS;
  const activeDevices = enabledDevices(breakpoints);
  const byDevice = new Map(breakpoints.map(b => [b.device, b]));
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
      {activeDevices.map(d => {
        const Icon = DEVICE_ICON_MAP[d] ?? Monitor;
        const entry = byDevice.get(d);
        const label = entry?.label ?? d;
        const tooltip =
          d === 'desktop'
            ? label
            : d === 'widescreen'
              ? `${label} (≥ ${entry?.width ?? 2400}px)`
              : `${label} (≤ ${entry?.width ?? 0}px)`;
        return (
          <IconButton
            key={d}
            size="sm"
            // The sliding indicator draws the active background.
            style={device === d ? { color: 'var(--ne-primary)' } : undefined}
            data-ne-active={device === d ? 'true' : undefined}
            aria-pressed={device === d}
            aria-label={label}
            tooltip={tooltip}
            onClick={() => store.setDevice(d)}
          >
            <Icon style={{ width: 14, height: 14 }} />
          </IconButton>
        );
      })}
    </fieldset>
  );
}
