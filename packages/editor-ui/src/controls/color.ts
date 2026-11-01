/** Pure color parsing and WCAG contrast utilities (E12d), kept DOM-free for tests. */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses hex (#rgb, #rgba, #rrggbb, #rrggbbaa) and rgb/rgba strings into { r, g, b, a }. */
export function parseColor(color: string): RGBA | null {
  if (!color || typeof color !== 'string') return null;
  const str = color.trim().toLowerCase();

  // Hex format
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a: Number(a.toFixed(2)) };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a: Number(a.toFixed(2)) };
    }
  }

  // rgb / rgba format
  const rgbMatch = str.match(
    /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/
  );
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)));
    const a =
      rgbMatch[4] !== undefined
        ? Math.min(1, Math.max(0, parseFloat(rgbMatch[4])))
        : 1;
    return { r, g, b, a: Number(a.toFixed(2)) };
  }

  // Common named fallback
  if (str === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (str === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  if (str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  return null;
}

/** Formats an RGBA object back to a 6-digit hex string (#rrggbb). */
export function toHex(color: RGBA): string {
  const r = Math.round(color.r).toString(16).padStart(2, '0');
  const g = Math.round(color.g).toString(16).padStart(2, '0');
  const b = Math.round(color.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/** WCAG 2.1 relative luminance for an sRGB component. */
function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance (0 for pure black, 1 for pure white). */
export function getLuminance(color: RGBA): number {
  return (
    0.2126 * channelLuminance(color.r) +
    0.7152 * channelLuminance(color.g) +
    0.0722 * channelLuminance(color.b)
  );
}

/** WCAG contrast ratio between two colors (range 1:1 to 21:1). */
export function getContrastRatio(
  foreground: string,
  background = '#FFFFFF'
): number {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return 1;

  // Composite semi-transparent foreground over background if alpha < 1
  const effectiveFg: RGBA =
    fg.a < 1
      ? {
          r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
          g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
          b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
          a: 1,
        }
      : fg;

  const l1 = getLuminance(effectiveFg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export type ContrastRating = 'AAA' | 'AA' | 'AA Large' | 'Fail';

/** Returns the WCAG rating for a given contrast ratio. */
export function getContrastRating(ratio: number): ContrastRating {
  if (ratio >= 7.0) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3.0) return 'AA Large';
  return 'Fail';
}
