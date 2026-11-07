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
  fontFamily: 'Inter' | 'Plus Jakarta Sans' | 'Manrope' | 'JetBrains Mono' | 'System';
  headingFont?:
    | 'Newsreader'
    | 'Fraunces'
    | 'Instrument Serif'
    | 'Playfair Display'
    | 'Inter'
    | 'Plus Jakarta Sans'
    | 'Manrope'
    | 'System'
    | string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  colorMode: 'light' | 'dark' | 'system';
  colors?: GlobalColorTokens;
  typography?: TypographyPreset[];
}

export const DEFAULT_GLOBAL_COLORS: GlobalColorTokens = {
  primary: '#0f5d4a',
  secondary: '#705d49',
  text: '#1d1b18',
  textMuted: '#4a453e',
  accent: '#0f5d4a',
  background: '#fef9f1',
  surface: '#f8f3ec',
  border: '#cec5bb',
  custom: [],
};

export const DEFAULT_TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  {
    id: 'display',
    name: 'Display',
    fontFamily: 'Newsreader',
    fontSize: { desktop: '4.5rem', tablet: '3.5rem', mobile: '2.75rem' },
    fontWeight: '400',
    lineHeight: '1.05',
    letterSpacing: '-0.02em',
  },
  {
    id: 'h1',
    name: 'Heading 1',
    fontFamily: 'Newsreader',
    fontSize: { desktop: '3rem', tablet: '2.5rem', mobile: '2rem' },
    fontWeight: '500',
    lineHeight: '1.15',
    letterSpacing: '-0.02em',
  },
  {
    id: 'h2',
    name: 'Heading 2',
    fontFamily: 'Newsreader',
    fontSize: { desktop: '2.25rem', tablet: '1.875rem', mobile: '1.5rem' },
    fontWeight: '500',
    lineHeight: '1.25',
    letterSpacing: '-0.015em',
  },
  {
    id: 'h3',
    name: 'Heading 3',
    fontFamily: 'Newsreader',
    fontSize: { desktop: '1.875rem', tablet: '1.5rem', mobile: '1.25rem' },
    fontWeight: '500',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
  },
  {
    id: 'h4',
    name: 'Heading 4',
    fontFamily: 'Newsreader',
    fontSize: { desktop: '1.5rem', tablet: '1.25rem', mobile: '1.125rem' },
    fontWeight: '500',
    lineHeight: '1.35',
  },
  {
    id: 'body',
    name: 'Body',
    fontFamily: 'Manrope',
    fontSize: '1rem',
    fontWeight: '400',
    lineHeight: '1.625',
  },
  {
    id: 'eyebrow',
    name: 'Eyebrow',
    fontFamily: 'Manrope',
    fontSize: '0.75rem',
    fontWeight: '600',
    lineHeight: '1.5',
    letterSpacing: '0.08em',
  },
  {
    id: 'caption',
    name: 'Caption',
    fontFamily: 'Manrope',
    fontSize: '0.875rem',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  {
    id: 'button',
    name: 'Button',
    fontFamily: 'Manrope',
    fontSize: '0.875rem',
    fontWeight: '500',
    lineHeight: '1',
  },
];

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primaryColor: '#0f5d4a',
  accentColor: '#0f5d4a',
  fontFamily: 'Manrope',
  headingFont: 'Newsreader',
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
