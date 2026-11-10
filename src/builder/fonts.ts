export interface FontDefinition {
  name: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
  stack: string;
  isGoogleFont?: boolean;
  /** Google Fonts axis spec (after `family=Name:`). Defaults to weights 100–900. */
  axes?: string;
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
    name: 'Manrope',
    category: 'sans-serif',
    stack: "'Manrope', ui-sans-serif, system-ui, sans-serif",
    isGoogleFont: true,
  },
  {
    name: 'Newsreader',
    category: 'serif',
    stack: "'Newsreader', Georgia, 'Times New Roman', serif",
    isGoogleFont: true,
    axes: 'ital,wght@0,200..800;1,200..800',
  },
  {
    name: 'Fraunces',
    category: 'serif',
    stack: "'Fraunces', Georgia, serif",
    isGoogleFont: true,
    axes: 'ital,wght@0,100..900;1,100..900',
  },
  {
    name: 'Instrument Serif',
    category: 'serif',
    stack: "'Instrument Serif', Georgia, serif",
    isGoogleFont: true,
    axes: 'ital@0;1',
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

export type CustomFontWeight = {
  weight: string;
  style?: string;
  mediaKey: string;
};

export type CustomFont = {
  family: string;
  weights: CustomFontWeight[];
};

const FONT_FORMATS: Record<string, string> = {
  woff2: 'woff2',
  woff: 'woff',
  ttf: 'truetype',
  otf: 'opentype',
};

/** Keeps a value inside a quoted CSS string: no quotes, backslashes, angle brackets or newlines. */
const cssString = (value: string) => value.replace(/['"\\<>\n\r]/g, '');

export function buildCustomFontsCss(customFonts?: CustomFont[]): string {
  if (!customFonts || customFonts.length === 0) return '';
  const rules: string[] = [];
  for (const font of customFonts) {
    const family = cssString(font.family ?? '').trim();
    if (!family) continue;
    for (const w of font.weights || []) {
      if (!w.mediaKey) continue;
      const raw =
        w.mediaKey.startsWith('/') || /^https?:\/\//i.test(w.mediaKey)
          ? w.mediaKey
          : `/media/${w.mediaKey}`;
      const url = cssString(raw);
      const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
      const format = FONT_FORMATS[ext] ?? 'woff2';
      const weight = /^\d{3}( \d{3})?$/.test(String(w.weight)) ? w.weight : '400';
      const style = w.style === 'italic' ? 'italic' : 'normal';
      rules.push(
        `@font-face {\n  font-family: '${family}';\n  src: url('${url}') format('${format}');\n  font-weight: ${weight};\n  font-style: ${style};\n  font-display: swap;\n}`
      );
    }
  }
  return rules.join('\n');
}

export function getAvailableFontFamilies(customFonts?: CustomFont[]): string[] {
  const customNames = (customFonts || []).map(f => f.family).filter(Boolean);
  return Array.from(new Set([...customNames, ...FONT_FAMILIES]));
}

export const FONT_STACK: Record<string, string> = Object.fromEntries(
  CURATED_FONTS.map(f => [f.name, f.stack])
);

export function getFontStack(family: string | undefined): string {
  if (!family) return FONT_STACK.System;
  if (FONT_STACK[family]) return FONT_STACK[family];
  return `'${family}', sans-serif`;
}

/** True only for curated fonts served by Google; uploaded or unknown names never are. */
export function isCuratedGoogleFont(family: string | undefined): boolean {
  if (!family) return false;
  const entry = CURATED_FONTS.find(f => f.name.toLowerCase() === family.toLowerCase());
  return Boolean(entry?.isGoogleFont);
}

export function isGoogleFont(family: string | undefined, customFonts?: CustomFont[]): boolean {
  if (!family || family === 'System') return false;
  if (customFonts?.some(cf => cf.family.toLowerCase() === family.toLowerCase())) return false;
  const entry = CURATED_FONTS.find(f => f.name.toLowerCase() === family.toLowerCase());
  return entry ? Boolean(entry.isGoogleFont) : true;
}

export function buildGoogleFontsUrl(families: string[], customFonts?: CustomFont[]): string | null {
  const unique = Array.from(
    new Set(families.map(f => f.trim()).filter(f => isGoogleFont(f, customFonts)))
  );
  if (unique.length === 0) return null;

  const params = unique
    .map(family => {
      const entry = CURATED_FONTS.find(
        f => f.name.toLowerCase() === family.toLowerCase()
      );
      const axes = entry?.axes ?? 'wght@100;200;300;400;500;600;700;800;900';
      return `family=${encodeURIComponent(family)}:${axes}`;
    })
    .join('&');

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
