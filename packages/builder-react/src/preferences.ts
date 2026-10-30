/**
 * Editor preferences (R733 / UXE-23): light/dark editor theme, density,
 * reduced motion, panel positions, default units, and RTL editor UI.
 * Stored in localStorage; the host applies the theme and direction.
 */

export type EditorTheme = 'light' | 'dark' | 'system';
export type EditorDensity = 'compact' | 'comfortable' | 'spacious';

export type EditorPreferences = {
  theme: EditorTheme;
  density: EditorDensity;
  reducedMotion: boolean;
  defaultUnit: 'px' | 'rem' | 'em';
  rtl: boolean;
  fontSize: number;
};

const STORAGE_KEY = 'nextcms-editor-preferences';

const DEFAULTS: EditorPreferences = {
  theme: 'system',
  density: 'comfortable',
  reducedMotion: false,
  defaultUnit: 'px',
  rtl: false,
  fontSize: 13,
};

export function createPreferencesStore(): {
  subscribe: (listener: () => void) => () => void;
  getState: () => EditorPreferences;
  set(key: keyof EditorPreferences, value: EditorPreferences[keyof EditorPreferences]): void;
  setMultiple(next: Partial<EditorPreferences>): void;
} {
  let state: EditorPreferences = { ...DEFAULTS };
  const listeners = new Set<() => void>();
  const set = (next: Partial<EditorPreferences>) => {
    state = { ...state, ...next };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
    for (const listener of listeners) listener();
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* noop */ }

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(key: keyof EditorPreferences, value: EditorPreferences[keyof EditorPreferences]) {
      set({ [key]: value });
    },
    setMultiple(next: Partial<EditorPreferences>) {
      set(next);
    },
  };
}

export type PreferencesStore = ReturnType<typeof createPreferencesStore>;

let preferencesStore: PreferencesStore | null = null;
export function setPreferencesStore(store: PreferencesStore) {
  preferencesStore = store;
}
export function getPreferencesStore(): PreferencesStore | null {
  return preferencesStore;
}

export function themeClass(prefs: EditorPreferences): string {
  if (prefs.theme === 'dark') return 'dark';
  if (prefs.theme === 'light') return '';
  return '';
}

export function dirAttribute(prefs: EditorPreferences): 'rtl' | 'ltr' {
  return prefs.rtl ? 'rtl' : 'ltr';
}

export function densityClass(prefs: EditorPreferences): string {
  return `density-${prefs.density}`;
}
