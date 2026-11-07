import type { ThemeTokens } from '@/db/schemas/pages.schema';

/**
 * "Quiet Editorial" — warm parchment canvas, deep emerald accent, Newsreader
 * headings over Plus Jakarta Sans, hairline borders and pill buttons. Values
 * come from the design reference in `design/` (AI Studio / Stitch export).
 */
export const QUIET_EDITORIAL_THEME: ThemeTokens = {
  primaryColor: '#004435',
  accentColor: '#934b1b',
  fontFamily: 'Plus Jakarta Sans',
  headingFont: 'Newsreader',
  borderRadius: 'lg',
  buttonRadius: 'full',
  colorMode: 'light',
  colors: {
    primary: '#004435',
    secondary: '#934b1b',
    accent: '#934b1b',
    text: '#1d1c17',
    textMuted: '#6f7974',
    background: '#fef9f1',
    surface: '#ffffff',
    surfaceAlt: '#f2ede6',
    primarySoft: '#e3efea',
    border: '#e7e2db',
    custom: [],
  },
  colorsDark: {
    primary: '#20c99b',
    secondary: '#7ed7b8',
    accent: '#7ed7b8',
    text: '#f4f7f4',
    textMuted: '#9eaba3',
    background: '#0e1513',
    surface: '#131c19',
    surfaceAlt: '#1a2522',
    primarySoft: '#102b23',
    border: '#1f342e',
  },
  typography: [
    {
      id: 'display',
      name: 'Display',
      fontSize: { desktop: '4rem', tablet: '3.25rem', mobile: '2.5rem' },
      fontWeight: '400',
      lineHeight: '1.08',
      letterSpacing: '-0.02em',
    },
    {
      id: 'h1',
      name: 'Heading 1',
      fontSize: { desktop: '3rem', tablet: '2.5rem', mobile: '2.125rem' },
      fontWeight: '400',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
    },
    {
      id: 'h2',
      name: 'Heading 2',
      fontSize: { desktop: '2.25rem', tablet: '1.875rem', mobile: '1.625rem' },
      fontWeight: '400',
      lineHeight: '1.2',
      letterSpacing: '-0.015em',
    },
    {
      id: 'h3',
      name: 'Heading 3',
      fontSize: { desktop: '1.5rem', tablet: '1.375rem', mobile: '1.25rem' },
      fontWeight: '500',
      lineHeight: '1.3',
    },
    {
      id: 'h4',
      name: 'Heading 4',
      fontSize: '1.25rem',
      fontWeight: '500',
      lineHeight: '1.35',
    },
    {
      id: 'lead',
      name: 'Lead',
      fontSize: { desktop: '1.25rem', mobile: '1.125rem' },
      fontWeight: '400',
      lineHeight: '1.6',
    },
    {
      id: 'body',
      name: 'Body',
      fontSize: '1rem',
      fontWeight: '400',
      lineHeight: '1.7',
    },
    {
      id: 'eyebrow',
      name: 'Eyebrow',
      fontSize: '0.6875rem',
      fontWeight: '700',
      lineHeight: '1.4',
      letterSpacing: '0.16em',
    },
    {
      id: 'caption',
      name: 'Caption',
      fontSize: '0.875rem',
      fontWeight: '400',
      lineHeight: '1.5',
    },
    {
      id: 'meta',
      name: 'Meta',
      fontSize: '0.75rem',
      fontWeight: '500',
      lineHeight: '1.4',
      letterSpacing: '0.04em',
    },
    {
      id: 'button',
      name: 'Button',
      fontSize: '0.875rem',
      fontWeight: '600',
      lineHeight: '1',
    },
  ],
};

export const THEME_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  tokens: ThemeTokens;
}> = [
  {
    id: 'quiet-editorial',
    name: 'Quiet Editorial',
    description:
      'Parchment and emerald, Newsreader serif headings, hairline borders, pill buttons. Includes a dark palette.',
    tokens: QUIET_EDITORIAL_THEME,
  },
];
