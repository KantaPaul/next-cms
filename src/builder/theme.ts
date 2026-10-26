import type { CSSProperties } from 'react';
import {
  DEFAULT_THEME_TOKENS,
  type ThemeTokens,
} from '@/db/schemas/pages.schema';

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

export const resolveThemeTokens = (
  tokens?: Partial<ThemeTokens> | null
): ThemeTokens => ({
  ...DEFAULT_THEME_TOKENS,
  ...tokens,
  primaryColor:
    tokens?.primaryColor && HEX.test(tokens.primaryColor)
      ? tokens.primaryColor
      : DEFAULT_THEME_TOKENS.primaryColor,
  accentColor:
    tokens?.accentColor && HEX.test(tokens.accentColor)
      ? tokens.accentColor
      : DEFAULT_THEME_TOKENS.accentColor,
});

/** CSS custom properties consumed by `site.css` and every builder block. */
export function themeStyle(
  tokens?: Partial<ThemeTokens> | null
): CSSProperties {
  const t = resolveThemeTokens(tokens);
  return {
    '--site-primary': t.primaryColor,
    '--site-accent': t.accentColor,
    '--site-radius': RADIUS[t.borderRadius] ?? RADIUS.md,
    '--site-font': FONT_STACK[t.fontFamily] ?? FONT_STACK.System,
  } as CSSProperties;
}

export function fontStylesheetUrl(tokens?: Partial<ThemeTokens> | null) {
  const font = resolveThemeTokens(tokens).fontFamily;
  if (font === 'System') return null;
  return `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap`;
}
