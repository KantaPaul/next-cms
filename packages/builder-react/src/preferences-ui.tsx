/**
 * Editor preferences UI (R733 / UXE-23): theme, density, reduced motion,
 * default units, RTL, and font size.
 */

import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import { getPreferencesStore, type EditorPreferences } from './preferences';

const smallButton: CSSProperties = {
  padding: '2px 8px',
  borderRadius: 4,
  border: '1px solid rgba(127,127,127,.35)',
  background: 'transparent',
  color: 'inherit',
  font: '12px/1.4 system-ui, sans-serif',
  cursor: 'pointer',
};

/** Preferences UI: theme, density, reduced motion, units, RTL, font size. */
export function PreferencesPanel() {
  const [state, setState] = useState(() => getPreferencesStore()?.getState() ?? {
    theme: 'system',
    density: 'comfortable',
    reducedMotion: false,
    defaultUnit: 'px',
    rtl: false,
    fontSize: 13,
  } as EditorPreferences);

  useSyncExternalStore(
    () => {
      const store = getPreferencesStore();
      if (!store) return () => {};
      return store.subscribe(() => setState(store.getState()));
    },
    () => getPreferencesStore()?.getState() ?? state,
    () => getPreferencesStore()?.getState() ?? state
  );

  const prefs = state as EditorPreferences;
  const setPref = (key: keyof EditorPreferences, value: EditorPreferences[keyof EditorPreferences]) => {
    const store = getPreferencesStore();
    if (store) store.set(key, value);
  };

  const themeOptions: { value: EditorPreferences['theme']; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];
  const densityOptions: { value: EditorPreferences['density']; label: string }[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'spacious', label: 'Spacious' },
  ];
  const unitOptions: { value: EditorPreferences['defaultUnit']; label: string }[] = [
    { value: 'px', label: 'px' },
    { value: 'rem', label: 'rem' },
    { value: 'em', label: 'em' },
  ];

  return (
    <div style={{ display: 'grid', gap: 12, font: '13px/1.4 system-ui, sans-serif' }}>
      <div style={{ font: '600 12px/1.4 system-ui, sans-serif', opacity: 0.8 }}>Editor preferences</div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ font: '600 11px/1.4 system-ui, sans-serif', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.04em' }}>Theme</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {themeOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={prefs.theme === opt.value}
              onClick={() => setPref('theme', opt.value)}
              style={{
                all: 'unset',
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: `1px solid ${prefs.theme === opt.value ? '#4f46e5' : 'rgba(127,127,127,.35)'}`,
                background: prefs.theme === opt.value ? 'rgba(79,70,229,.15)' : 'transparent',
                color: prefs.theme === opt.value ? '#4f46e5' : 'inherit',
                font: '600 12px/1.4 system-ui, sans-serif',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ font: '600 11px/1.4 system-ui, sans-serif', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.04em' }}>Density</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {densityOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={prefs.density === opt.value}
              onClick={() => setPref('density', opt.value)}
              style={{
                all: 'unset',
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: `1px solid ${prefs.density === opt.value ? '#4f46e5' : 'rgba(127,127,127,.35)'}`,
                background: prefs.density === opt.value ? 'rgba(79,70,229,.15)' : 'transparent',
                color: prefs.density === opt.value ? '#4f46e5' : 'inherit',
                font: '600 12px/1.4 system-ui, sans-serif',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ font: '600 11px/1.4 system-ui, sans-serif', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.04em' }}>Default unit</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {unitOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={prefs.defaultUnit === opt.value}
              onClick={() => setPref('defaultUnit', opt.value)}
              style={{
                all: 'unset',
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: `1px solid ${prefs.defaultUnit === opt.value ? '#4f46e5' : 'rgba(127,127,127,.35)'}`,
                background: prefs.defaultUnit === opt.value ? 'rgba(79,70,229,.15)' : 'transparent',
                color: prefs.defaultUnit === opt.value ? '#4f46e5' : 'inherit',
                font: '600 12px/1.4 system-ui, sans-serif',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={prefs.reducedMotion}
            onChange={event => setPref('reducedMotion', event.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <label style={{ font: '13px/1.4 system-ui, sans-serif', cursor: 'pointer', userSelect: 'none' }}>
            Reduce motion
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={prefs.rtl}
            onChange={event => setPref('rtl', event.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <label style={{ font: '13px/1.4 system-ui, sans-serif', cursor: 'pointer', userSelect: 'none' }}>
            Right-to-left editor UI
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ font: '13px/1.4 system-ui, sans-serif', minWidth: 60 }}>Font size</span>
          <input
            type="number"
            min={10}
            max={20}
            step={1}
            value={prefs.fontSize}
            onChange={event => setPref('fontSize', Number(event.target.value) || 13)}
            style={{
              width: 45,
              padding: '4px 6px',
              borderRadius: 4,
              border: '1px solid rgba(127,127,127,.35)',
              background: 'transparent',
              color: 'inherit',
              font: '13px/1.4 system-ui, sans-serif',
            }}
          />
        </div>
      </div>
    </div>
  );
}
