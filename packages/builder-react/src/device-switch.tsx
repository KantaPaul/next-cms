/**
 * Elementor-style device switcher: shows the active device icon, and clicking
 * opens a vertical list of all enabled breakpoints top to bottom.
 */

import {
  DEFAULT_BREAKPOINTS,
  DEVICE_LABELS,
  enabledDevices,
} from '@nextcms/builder-core';
import {
  DEVICE_ICON_MAP,
  IconButton,
  Popover,
} from '@nextcms/editor-ui';
import { Check, ChevronDown, Monitor } from 'lucide-react';
import type { CSSProperties } from 'react';
import React from 'react';
import { useEditor, useEditorStore } from './context';

export function DeviceSwitch({ style }: { style?: CSSProperties }) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  const breakpoints = useEditor(state => state.breakpoints) ?? DEFAULT_BREAKPOINTS;
  const activeDevices = enabledDevices(breakpoints);
  const byDevice = new Map(breakpoints.map(b => [b.device, b]));
  const activeEntry = byDevice.get(device);
  const activeLabel = activeEntry?.label ?? DEVICE_LABELS[device] ?? device;
  const ActiveIcon = DEVICE_ICON_MAP[device] ?? Monitor;

  return (
    <div style={{ display: 'inline-flex', ...style }}>
      <Popover
        align="end"
        className="w-48 min-w-[12rem] p-1"
        trigger={
          <IconButton
            size="sm"
            aria-label={`Edit for device: ${activeLabel}`}
            tooltip={`${activeLabel} — click to switch device`}
            style={{
              width: 'auto',
              paddingInline: 6,
              gap: 3,
              color: 'var(--ne-primary)',
              backgroundColor: 'var(--ne-primary-soft)',
            }}
          >
            <ActiveIcon style={{ width: 14, height: 14 }} />
            <ChevronDown style={{ width: 10, height: 10, opacity: 0.75 }} />
          </IconButton>
        }
        content={close => (
          <div
            role="listbox"
            aria-label="Edit for device"
            className="flex flex-col gap-0.5"
          >
            {activeDevices.map(d => {
              const Icon = DEVICE_ICON_MAP[d] ?? Monitor;
              const entry = byDevice.get(d);
              const label = entry?.label ?? DEVICE_LABELS[d] ?? d;
              const hint =
                d === 'desktop'
                  ? 'Default'
                  : d === 'widescreen'
                    ? `≥ ${entry?.width ?? 2400}px`
                    : `≤ ${entry?.width ?? 0}px`;
              const selected = device === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    store.setDevice(d);
                    close();
                  }}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    border: 0,
                    borderRadius: 'var(--ne-radius-sm)',
                    padding: '6px 8px',
                    fontSize: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: selected ? 'var(--ne-primary-soft)' : 'transparent',
                    color: selected ? 'var(--ne-primary)' : 'var(--ne-text)',
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <span className="truncate">{label}</span>
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                      fontSize: 10,
                      color: 'var(--ne-text-muted)',
                    }}
                  >
                    <span>{hint}</span>
                    {selected && <Check style={{ width: 12, height: 12, color: 'var(--ne-primary)' }} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      />
    </div>
  );
}
