import type { CSSProperties } from 'react';
import {
  DEFAULT_GLOBAL_COLORS,
  DEFAULT_THEME_TOKENS,
  DEFAULT_TYPOGRAPHY_PRESETS,
  type GlobalColorTokens,
  type ThemeTokens,
  type TypographyPreset,
} from '@/db/schemas/pages.schema';

export type { GlobalColorTokens, TypographyPreset, ThemeTokens };

const RADIUS: Record<ThemeTokens['borderRadius'], string> = {
  none: '0px',
  sm: '0.375rem',
  md: '0.75rem',
  lg: '1.25rem',
  full: '9999px',
};

const FONT_STACK: Record<string, string> = {
  Inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  'Plus Jakarta Sans':
    "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  Manrope: "'Manrope', ui-sans-serif, system-ui, sans-serif",
  'JetBrains Mono': "'JetBrains Mono', ui-monospace, monospace",
  System: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
};

const HEADING_FONT_STACK: Record<string, string> = {
  Newsreader: "'Newsreader', Garamond, Georgia, 'Times New Roman', serif",
  Fraunces: "'Fraunces', Georgia, serif",
  'Instrument Serif': "'Instrument Serif', Garamond, serif",
  'Playfair Display': "'Playfair Display', Georgia, serif",
  Inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  'Plus Jakarta Sans':
    "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  Manrope: "'Manrope', ui-sans-serif, system-ui, sans-serif",
  System: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
};

function getContrastColor(hex: string): string {
  if (!hex || !HEX.test(hex)) return '#ffffff';
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#003829' : '#ffffff';
}

const HEX = /^#[0-9a-f]{3,8}$/i;

function sanitizeTokenKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

export const resolveThemeTokens = (
  tokens?: Partial<ThemeTokens> | null
): ThemeTokens => {
  const primary =
    tokens?.primaryColor && HEX.test(tokens.primaryColor)
      ? tokens.primaryColor
      : tokens?.colors?.primary && HEX.test(tokens.colors.primary)
        ? tokens.colors.primary
        : DEFAULT_THEME_TOKENS.primaryColor;

  const accent =
    tokens?.accentColor && HEX.test(tokens.accentColor)
      ? tokens.accentColor
      : tokens?.colors?.accent && HEX.test(tokens.colors.accent)
        ? tokens.colors.accent
        : DEFAULT_THEME_TOKENS.accentColor;

  const colors: GlobalColorTokens = {
    ...DEFAULT_GLOBAL_COLORS,
    ...tokens?.colors,
    primary,
    accent,
    custom: tokens?.colors?.custom ?? DEFAULT_GLOBAL_COLORS.custom,
  };

  const typography: TypographyPreset[] =
    tokens?.typography && tokens.typography.length > 0
      ? tokens.typography
      : DEFAULT_TYPOGRAPHY_PRESETS;

  return {
    ...DEFAULT_THEME_TOKENS,
    ...tokens,
    primaryColor: primary,
    accentColor: accent,
    colors,
    typography,
  };
};

/**
 * Resolves a token reference (e.g. 'token:primary', 'token:custom-1', or 'primary')
 * to its concrete color value, with safe fallback on deleted/missing tokens (R423 / BLD-31).
 */
export function resolveTokenValue(
  reference: string,
  tokens?: Partial<ThemeTokens> | null,
  fallback = '#0f172a'
): string {
  if (!reference) return fallback;
  if (reference.startsWith('#') || reference.startsWith('rgb') || reference.startsWith('hsl')) {
    return reference;
  }

  const t = resolveThemeTokens(tokens);
  const cleanRef = reference.startsWith('token:') ? reference.slice(6) : reference;

  const coreColors = t.colors as Record<string, unknown> | undefined;
  if (coreColors && typeof coreColors[cleanRef] === 'string') {
    return coreColors[cleanRef] as string;
  }

  // Look in custom color tokens
  const customMatch = t.colors?.custom?.find(
    c => c.id === cleanRef || sanitizeTokenKey(c.name) === sanitizeTokenKey(cleanRef)
  );
  if (customMatch?.value) {
    return customMatch.value;
  }

  // Fallbacks for known token names
  if (cleanRef === 'primary') return t.primaryColor;
  if (cleanRef === 'accent') return t.accentColor;
  if (cleanRef === 'text') return t.colors?.text ?? DEFAULT_GLOBAL_COLORS.text ?? fallback;
  if (cleanRef === 'background') return t.colors?.background ?? DEFAULT_GLOBAL_COLORS.background ?? '#ffffff';
  if (cleanRef === 'surface') return t.colors?.surface ?? DEFAULT_GLOBAL_COLORS.surface ?? '#f8fafc';
  if (cleanRef === 'border') return t.colors?.border ?? DEFAULT_GLOBAL_COLORS.border ?? '#e2e8f0';

  return fallback;
}

export type ThemeColorToken = {
  name: string;
  value: string;
  /** The custom property `themeStyle` emits for this token. */
  cssVar: string;
};

const CORE_COLOR_TOKENS: Array<{
  key: Exclude<keyof GlobalColorTokens, 'custom'>;
  name: string;
  cssVar: string;
}> = [
  { key: 'primary', name: 'Primary', cssVar: '--site-color-primary' },
  { key: 'secondary', name: 'Secondary', cssVar: '--site-color-secondary' },
  { key: 'accent', name: 'Accent', cssVar: '--site-color-accent' },
  { key: 'text', name: 'Text', cssVar: '--site-color-text' },
  { key: 'textMuted', name: 'Text Muted', cssVar: '--site-color-text-muted' },
  { key: 'background', name: 'Background', cssVar: '--site-color-background' },
  { key: 'surface', name: 'Surface', cssVar: '--site-color-surface' },
  { key: 'border', name: 'Border', cssVar: '--site-color-border' },
];

/** The site's color variables (Settings → Theme), in the shape color pickers list them. */
export function themeColorTokens(
  tokens?: Partial<ThemeTokens> | null
): ThemeColorToken[] {
  const colors = resolveThemeTokens(tokens).colors ?? DEFAULT_GLOBAL_COLORS;
  const core = CORE_COLOR_TOKENS.map(({ key, name, cssVar }) => ({
    name,
    cssVar,
    value: colors[key] ?? DEFAULT_GLOBAL_COLORS[key] ?? '#000000',
  }));
  const custom = (colors.custom ?? [])
    .filter(c => c.id && c.value)
    .map(c => ({
      name: c.name || c.id,
      value: c.value,
      cssVar: `--site-token-${sanitizeTokenKey(c.id)}`,
    }));
  return [...core, ...custom];
}

/** CSS custom properties consumed by `site.css` and every builder block (R419, R420, R423). */
export function themeStyle(
  tokens?: Partial<ThemeTokens> | null
): CSSProperties {
  const t = resolveThemeTokens(tokens);
  const colors = t.colors ?? DEFAULT_GLOBAL_COLORS;

  const styles: Record<string, string> = {
    '--site-primary': t.primaryColor,
    '--site-accent': t.accentColor,
    '--site-on-primary': getContrastColor(t.primaryColor),
    '--site-radius': RADIUS[t.borderRadius] ?? RADIUS.md,
    '--site-radius-sm': '4px',
    '--site-radius-md': '6px',
    '--site-radius-lg': '8px',
    '--site-radius-xl': '12px',
    '--site-radius-full': '9999px',
    '--site-font': FONT_STACK[t.fontFamily] ?? FONT_STACK.Manrope ?? FONT_STACK.System,
    '--site-font-body': FONT_STACK[t.fontFamily] ?? FONT_STACK.Manrope ?? FONT_STACK.System,
    '--site-font-heading': (t.headingFont && HEADING_FONT_STACK[t.headingFont]) ? HEADING_FONT_STACK[t.headingFont] : HEADING_FONT_STACK.Newsreader,

    // Global color tokens
    '--site-color-primary': colors.primary ?? t.primaryColor,
    '--site-color-secondary': colors.secondary ?? DEFAULT_GLOBAL_COLORS.secondary ?? '#705d49',
    '--site-color-text': colors.text ?? DEFAULT_GLOBAL_COLORS.text ?? '#1d1b18',
    '--site-color-text-muted': colors.textMuted ?? DEFAULT_GLOBAL_COLORS.textMuted ?? '#4a453e',
    '--site-color-accent': colors.accent ?? t.accentColor,
    '--site-color-background': colors.background ?? DEFAULT_GLOBAL_COLORS.background ?? '#fef9f1',
    '--site-color-surface': colors.surface ?? DEFAULT_GLOBAL_COLORS.surface ?? '#f8f3ec',
    '--site-color-border': colors.border ?? DEFAULT_GLOBAL_COLORS.border ?? '#cec5bb',
  };

  // Custom tokens
  if (colors.custom) {
    for (const custom of colors.custom) {
      if (custom.id && custom.value) {
        styles[`--site-token-${sanitizeTokenKey(custom.id)}`] = custom.value;
      }
    }
  }

  // Typography presets
  const presets = t.typography ?? DEFAULT_TYPOGRAPHY_PRESETS;
  for (const preset of presets) {
    const key = sanitizeTokenKey(preset.id);
    if (preset.fontFamily) {
      styles[`--site-type-${key}-font`] = preset.fontFamily;
    }
    if (preset.fontSize) {
      const size =
        typeof preset.fontSize === 'object' && preset.fontSize !== null
          ? String(preset.fontSize.desktop ?? '1rem')
          : String(preset.fontSize);
      styles[`--site-type-${key}-size`] = size;
    }
    if (preset.fontWeight) {
      styles[`--site-type-${key}-weight`] = String(preset.fontWeight);
    }
    if (preset.lineHeight) {
      styles[`--site-type-${key}-line-height`] = String(preset.lineHeight);
    }
    if (preset.letterSpacing) {
      styles[`--site-type-${key}-letter-spacing`] = preset.letterSpacing;
    }
  }

  return styles as CSSProperties;
}

import { buildGoogleFontsUrl, isGoogleFont } from './fonts';

export function fontStylesheetUrl(
  tokens?: Partial<ThemeTokens> | null,
  additionalFamilies: string[] = []
): string | null {
  const t = resolveThemeTokens(tokens);
  const themeFont = t.fontFamily;
  const headingFont = t.headingFont;
  const allFonts: string[] = [];
  if (themeFont && themeFont !== 'System') {
    allFonts.push(themeFont);
  }
  if (headingFont && headingFont !== 'System' && !allFonts.includes(headingFont)) {
    allFonts.push(headingFont);
  }
  for (const f of additionalFamilies) {
    if (f && f !== 'System' && isGoogleFont(f) && !allFonts.includes(f)) {
      allFonts.push(f);
    }
  }

  return buildGoogleFontsUrl(allFonts);
}
