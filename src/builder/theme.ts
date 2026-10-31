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

const FONT_STACK: Record<ThemeTokens['fontFamily'], string> = {
  Inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  'Plus Jakarta Sans':
    "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  'JetBrains Mono': "'JetBrains Mono', ui-monospace, monospace",
  System: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
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

/** CSS custom properties consumed by `site.css` and every builder block (R419, R420, R423). */
export function themeStyle(
  tokens?: Partial<ThemeTokens> | null
): CSSProperties {
  const t = resolveThemeTokens(tokens);
  const colors = t.colors ?? DEFAULT_GLOBAL_COLORS;

  const styles: Record<string, string> = {
    '--site-primary': t.primaryColor,
    '--site-accent': t.accentColor,
    '--site-radius': RADIUS[t.borderRadius] ?? RADIUS.md,
    '--site-font': FONT_STACK[t.fontFamily] ?? FONT_STACK.System,

    // Global color tokens
    '--site-color-primary': colors.primary ?? t.primaryColor,
    '--site-color-secondary': colors.secondary ?? DEFAULT_GLOBAL_COLORS.secondary ?? '#64748b',
    '--site-color-text': colors.text ?? DEFAULT_GLOBAL_COLORS.text ?? '#0f172a',
    '--site-color-text-muted': colors.textMuted ?? DEFAULT_GLOBAL_COLORS.textMuted ?? '#64748b',
    '--site-color-accent': colors.accent ?? t.accentColor,
    '--site-color-background': colors.background ?? DEFAULT_GLOBAL_COLORS.background ?? '#ffffff',
    '--site-color-surface': colors.surface ?? DEFAULT_GLOBAL_COLORS.surface ?? '#f8fafc',
    '--site-color-border': colors.border ?? DEFAULT_GLOBAL_COLORS.border ?? '#e2e8f0',
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

export function fontStylesheetUrl(tokens?: Partial<ThemeTokens> | null) {
  const font = resolveThemeTokens(tokens).fontFamily;
  if (font === 'System') return null;
  return `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap`;
}
