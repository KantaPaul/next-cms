export type ThemeTokens = {
  primaryColor: string;
  accentColor: string;
  fontFamily: 'Inter' | 'Plus Jakarta Sans' | 'JetBrains Mono' | 'System';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  colorMode: 'light' | 'dark' | 'system';
};

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primaryColor: '#4f46e5',
  accentColor: '#0ea5e9',
  fontFamily: 'Inter',
  borderRadius: 'md',
  colorMode: 'light',
};
