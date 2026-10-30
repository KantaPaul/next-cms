/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NextCMS Editor UI Tokens
 * Typed exports reflecting the --ne-* CSS variables and system rules
 */

export const editorTokens = {
  colors: {
    light: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceSubtle: '#F1F5F9',
      surfaceHover: '#E2E8F0',
      border: '#E2E8F0',
      borderStrong: '#CBD5E1',
      text: '#0F172A',
      textMuted: '#64748B',
      textSubtle: '#94A3B8',
      primary: '#2563EB',
      primaryHover: '#1D4ED8',
      primarySoft: '#DBEAFE',
      success: '#059669',
      warning: '#D97706',
      danger: '#DC2626',
    },
    dark: {
      bg: '#0B1220',
      surface: '#111A2E',
      surfaceSubtle: '#192540',
      surfaceHover: '#223254',
      border: '#24314D',
      borderStrong: '#334468',
      text: '#E5EAF3',
      textMuted: '#94A3B8',
      textSubtle: '#64748B',
      primary: '#60A5FA',
      primaryHover: '#3B82F6',
      primarySoft: '#1E2A4A',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
    },
    overlay: {
      select: 'var(--ne-primary)',
      hover: 'var(--ne-hover)',
      drop: 'var(--ne-drop)',
      locked: 'var(--ne-locked)',
      focusRing: 'var(--ne-focus-ring)',
    },
    // Chart palette (colorblind-safe sequence from specification)
    charts: [
      '#2563EB', // Blue
      '#F59E0B', // Amber
      '#10B981', // Emerald
      '#8B5CF6', // Purple
      '#EF4444', // Red
      '#06B6D4', // Cyan
      '#64748B', // Slate
    ],
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontMono: 'JetBrains Mono, monospace',
    sizes: {
      title: '24px',
      panelTitle: '14px',
      kpiValue: '28px',
      body: '13px',
      caption: '12px',
    },
  },
  spacing: {
    base: 4,
    scale: [0, 4, 8, 12, 16, 24, 32, 48, 64],
    panelPadding: 16,
    gridGap: 16,
  },
  geometry: {
    radiusSm: '4px',
    radiusMd: '6px',
    radiusLg: '8px',
    controlHeight: 28,
    rowHeight: 32,
    panelLeftWidth: 260,
    inspectorWidth: 320,
  },
  motion: {
    durationFast: '150ms',
    durationNormal: '200ms',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

export type EditorTokens = typeof editorTokens;
