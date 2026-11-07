export interface FontDefinition {
  name: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
  stack: string;
  isGoogleFont?: boolean;
}

export const CURATED_FONTS: FontDefinition[] = [
  {
    name: 'System',
    category: 'sans-serif',
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    isGoogleFont: false,
  },
  {
    name: 'Inter',
    category: 'sans-serif',
    stack: "'Inter', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Plus Jakarta Sans',
    category: 'sans-serif',
    stack: "'Plus Jakarta Sans', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Manrope',
    category: 'sans-serif',
    stack: "'Manrope', ui-sans-serif, system-ui, sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Newsreader',
    category: 'serif',
    stack: "'Newsreader', Garamond, Georgia, 'Times New Roman', serif",
    isGoogleFont: true,
  },
  {
    name: 'Fraunces',
    category: 'serif',
    stack: "'Fraunces', Georgia, serif",
    isGoogleFont: true,
  },
  {
    name: 'Instrument Serif',
    category: 'serif',
    stack: "'Instrument Serif', Garamond, serif",
    isGoogleFont: true,
  },
  {
    name: 'Roboto',
    category: 'sans-serif',
    stack: "'Roboto', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Open Sans',
    category: 'sans-serif',
    stack: "'Open Sans', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Lato',
    category: 'sans-serif',
    stack: "'Lato', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Montserrat',
    category: 'sans-serif',
    stack: "'Montserrat', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Poppins',
    category: 'sans-serif',
    stack: "'Poppins', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'DM Sans',
    category: 'sans-serif',
    stack: "'DM Sans', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Space Grotesk',
    category: 'sans-serif',
    stack: "'Space Grotesk', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Raleway',
    category: 'sans-serif',
    stack: "'Raleway', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Nunito',
    category: 'sans-serif',
    stack: "'Nunito', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Rubik',
    category: 'sans-serif',
    stack: "'Rubik', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Work Sans',
    category: 'sans-serif',
    stack: "'Work Sans', sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Playfair Display',
    category: 'serif',
    stack: "'Playfair Display', Georgia, serif",
    isGoogleFont: true,
  },
  {
    name: 'Merriweather',
    category: 'serif',
    stack: "'Merriweather', Georgia, serif",
    isGoogleFont: true,
  },
  {
    name: 'Lora',
    category: 'serif',
    stack: "'Lora', Georgia, serif",
    isGoogleFont: true,
  },
  {
    name: 'Cinzel',
    category: 'serif',
    stack: "'Cinzel', Georgia, serif",
    isGoogleFont: true,
  },
  {
    name: 'JetBrains Mono',
    category: 'monospace',
    stack: "'JetBrains Mono', monospace",
    isGoogleFont: true,
  },
  {
    name: 'Fira Code',
    category: 'monospace',
    stack: "'Fira Code', monospace",
    isGoogleFont: true,
  },
  {
    name: 'Inconsolata',
    category: 'monospace',
    stack: "'Inconsolata', monospace",
    isGoogleFont: true,
  },
  {
    name: 'Oswald',
    category: 'display',
    stack: "'Oswald', sans-serif",
    isGoogleFont: true,
  },
];

export const FONT_FAMILIES = CURATED_FONTS.map(f => f.name);

export const FONT_STACK: Record<string, string> = Object.fromEntries(
  CURATED_FONTS.map(f => [f.name, f.stack])
);

export function getFontStack(family: string | undefined): string {
  if (!family) return FONT_STACK.System;
  if (FONT_STACK[family]) return FONT_STACK[family];
  return `'${family}', sans-serif`;
}

export function isGoogleFont(family: string | undefined): boolean {
  if (!family || family === 'System') return false;
  const entry = CURATED_FONTS.find(f => f.name.toLowerCase() === family.toLowerCase());
  return entry ? Boolean(entry.isGoogleFont) : true;
}

export function buildGoogleFontsUrl(families: string[]): string | null {
  const unique = Array.from(
    new Set(families.map(f => f.trim()).filter(f => isGoogleFont(f)))
  );
  if (unique.length === 0) return null;

  const params = unique
    .map(family => `family=${encodeURIComponent(family)}:wght@100;200;300;400;500;600;700;800;900`)
    .join('&');

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
