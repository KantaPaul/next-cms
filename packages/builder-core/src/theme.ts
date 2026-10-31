/**
 * Global design system tokens and typography presets (R419, R420, R421, R423 / BLD-27–31).
 */

export interface GlobalColorTokens {
  primary?: string;
  secondary?: string;
  text?: string;
  textMuted?: string;
  accent?: string;
  background?: string;
  surface?: string;
  border?: string;
  custom?: Array<{ id: string; name: string; value: string }>;
}

export interface TypographyPreset {
  id: string;
  name: string;
  fontFamily?: string;
  fontSize?:
    | string
    | number
    | {
        desktop?: string | number;
        tablet?: string | number;
        mobile?: string | number;
      };
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
}

export interface ThemeTokens {
  primaryColor: string;
  accentColor: string;
  fontFamily: 'Inter' | 'Plus Jakarta Sans' | 'JetBrains Mono' | 'System';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  colorMode: 'light' | 'dark' | 'system';
  colors?: GlobalColorTokens;
  typography?: TypographyPreset[];
}

export const DEFAULT_GLOBAL_COLORS: GlobalColorTokens = {
  primary: '#4f46e5',
  secondary: '#64748b',
  text: '#0f172a',
  textMuted: '#64748b',
  accent: '#0ea5e9',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  custom: [],
};

export const DEFAULT_TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  {
    id: 'h1',
    name: 'Heading 1',
    fontFamily: 'Inter',
    fontSize: { desktop: '2.5rem', tablet: '2rem', mobile: '1.75rem' },
    fontWeight: '700',
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
  },
  {
    id: 'h2',
    name: 'Heading 2',
    fontFamily: 'Inter',
    fontSize: { desktop: '2rem', tablet: '1.75rem', mobile: '1.5rem' },
    fontWeight: '600',
    lineHeight: '1.25',
    letterSpacing: '-0.01em',
  },
  {
    id: 'h3',
    name: 'Heading 3',
    fontFamily: 'Inter',
    fontSize: { desktop: '1.5rem', tablet: '1.35rem', mobile: '1.25rem' },
    fontWeight: '600',
    lineHeight: '1.3',
  },
  {
    id: 'body',
    name: 'Body',
    fontFamily: 'Inter',
    fontSize: '1rem',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  {
    id: 'caption',
    name: 'Caption',
    fontFamily: 'Inter',
    fontSize: '0.875rem',
    fontWeight: '400',
    lineHeight: '1.4',
  },
  {
    id: 'button',
    name: 'Button',
    fontFamily: 'Inter',
    fontSize: '0.875rem',
    fontWeight: '500',
    lineHeight: '1',
  },
];

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primaryColor: '#4f46e5',
  accentColor: '#0ea5e9',
  fontFamily: 'Inter',
  borderRadius: 'md',
  colorMode: 'light',
  colors: DEFAULT_GLOBAL_COLORS,
  typography: DEFAULT_TYPOGRAPHY_PRESETS,
};

export function resolveTokenValue(
  reference: string,
  tokens?: Partial<ThemeTokens> | null,
  fallback = '#0f172a'
): string {
  if (!reference) return fallback;
  if (
    reference.startsWith('#') ||
    reference.startsWith('rgb') ||
    reference.startsWith('hsl')
  ) {
    return reference;
  }

  const cleanRef = reference.startsWith('token:')
    ? reference.slice(6)
    : reference;
  const colors = tokens?.colors ?? DEFAULT_GLOBAL_COLORS;

  const coreColors = colors as Record<string, unknown>;
  if (typeof coreColors[cleanRef] === 'string') {
    return coreColors[cleanRef] as string;
  }

  const customMatch = colors.custom?.find(
    c => c.id === cleanRef || c.name.toLowerCase() === cleanRef.toLowerCase()
  );
  if (customMatch?.value) {
    return customMatch.value;
  }

  if (cleanRef === 'primary') return tokens?.primaryColor ?? DEFAULT_THEME_TOKENS.primaryColor;
  if (cleanRef === 'accent') return tokens?.accentColor ?? DEFAULT_THEME_TOKENS.accentColor;
  if (cleanRef === 'text') return colors.text ?? DEFAULT_GLOBAL_COLORS.text ?? fallback;
  if (cleanRef === 'background') return colors.background ?? DEFAULT_GLOBAL_COLORS.background ?? '#ffffff';
  if (cleanRef === 'surface') return colors.surface ?? DEFAULT_GLOBAL_COLORS.surface ?? '#f8fafc';
  if (cleanRef === 'border') return colors.border ?? DEFAULT_GLOBAL_COLORS.border ?? '#e2e8f0';

  return fallback;
}
