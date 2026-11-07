import type { CSSProperties } from 'react';
import {
  buildGoogleFontsUrl,
  FONT_FAMILIES,
  getFontStack,
  isGoogleFont,
} from './fonts';
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

  const colorsDark = Object.fromEntries(
    Object.entries(tokens?.colorsDark ?? {}).filter(
      ([, v]) => typeof v === 'string' && HEX.test(v)
    )
  ) as ThemeTokens['colorsDark'];

  const headingFont =
    tokens?.headingFont && FONT_FAMILIES.includes(tokens.headingFont)
      ? tokens.headingFont
      : undefined;

  return {
    ...DEFAULT_THEME_TOKENS,
    ...tokens,
    primaryColor: primary,
    accentColor: accent,
    colors,
    colorsDark,
    headingFont,
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
  { key: 'surfaceAlt', name: 'Surface Alt', cssVar: '--site-color-surface-alt' },
  { key: 'primarySoft', name: 'Primary Soft', cssVar: '--site-color-primary-soft' },
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
  const bodyStack = getFontStack(t.fontFamily);

  const styles: Record<string, string> = {
    // `--site-primary` / `--site-accent` are derived in site.css from the
    // `--site-color-*` tokens below, so dark mode can swap them.
    '--site-radius': RADIUS[t.borderRadius] ?? RADIUS.md,
    '--site-btn-radius':
      RADIUS[t.buttonRadius ?? t.borderRadius] ?? RADIUS.md,
    '--site-font': bodyStack,
    '--site-font-heading': t.headingFont
      ? getFontStack(t.headingFont)
      : bodyStack,
  };

  // Global color tokens (light) and their dark-mode counterparts.
  for (const { key, cssVar } of CORE_COLOR_TOKENS) {
    const light =
      key === 'primary'
        ? (colors.primary ?? t.primaryColor)
        : key === 'accent'
          ? (colors.accent ?? t.accentColor)
          : (colors[key] ?? DEFAULT_GLOBAL_COLORS[key]);
    if (light) styles[cssVar] = light;
    const dark = t.colorsDark?.[key];
    if (dark) styles[`${cssVar}-dark`] = dark;
  }

  // Custom tokens
  if (colors.custom) {
    for (const custom of colors.custom) {
      if (custom.id && custom.value) {
        styles[`--site-token-${sanitizeTokenKey(custom.id)}`] = custom.value;
      }
    }
  }

  // Typography presets → `--site-type-<id>-*`. Sizes are emitted per device
  // (`-size` desktop, `-size-t` tablet, `-size-m` mobile) for `.s-type-<id>`.
  const presets = t.typography ?? DEFAULT_TYPOGRAPHY_PRESETS;
  for (const preset of presets) {
    const key = sanitizeTokenKey(preset.id);
    if (preset.fontFamily) {
      styles[`--site-type-${key}-font`] = getFontStack(preset.fontFamily);
    }
    if (preset.fontSize !== undefined && preset.fontSize !== '') {
      const fs = preset.fontSize;
      const size = (v: string | number | undefined) =>
        v === undefined || v === '' ? undefined : typeof v === 'number' ? `${v}px` : v;
      if (typeof fs === 'object' && fs !== null) {
        const d = size(fs.desktop) ?? size(fs.tablet) ?? size(fs.mobile);
        const tb = size(fs.tablet) ?? d;
        const m = size(fs.mobile) ?? tb;
        if (d) styles[`--site-type-${key}-size`] = d;
        if (tb) styles[`--site-type-${key}-size-t`] = tb;
        if (m) styles[`--site-type-${key}-size-m`] = m;
      } else {
        const v = size(fs);
        if (v) {
          styles[`--site-type-${key}-size`] = v;
          styles[`--site-type-${key}-size-t`] = v;
          styles[`--site-type-${key}-size-m`] = v;
        }
      }
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



export function fontStylesheetUrl(
  tokens?: Partial<ThemeTokens> | null,
  additionalFamilies: string[] = []
): string | null {
  const t = resolveThemeTokens(tokens);
  const allFonts: string[] = [];
  for (const f of [
    t.fontFamily,
    t.headingFont,
    ...(t.typography ?? []).map(p => p.fontFamily),
  ]) {
    if (f && f !== 'System') allFonts.push(f);
  }
  for (const f of additionalFamilies) {
    if (f && f !== 'System' && isGoogleFont(f)) {
      allFonts.push(f);
    }
  }

  return buildGoogleFontsUrl(allFonts);
}
