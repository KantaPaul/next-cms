/**
 * Style group schemas, value shapes, and CSS whitelist mapping (E12f/g).
 *
 * Defines Zod schemas and TypeScript interfaces for:
 * - Typography
 * - Border & Radius
 * - Box & Text Shadow
 * - Background (Solid, Gradient, Image)
 * - Flex Container & Alignment
 *
 * Provides a strict CSS allowlist mapper that turns typed style values into
 * sanitized CSS declarations, preventing CSS injection.
 */

import { z } from 'zod';

/* =========================================================================
   1. Typography Schema & Types
   ========================================================================= */

export const typographySchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.union([z.number(), z.string()]).optional(),
  fontWeight: z.union([z.number(), z.string()]).optional(),
  lineHeight: z.union([z.number(), z.string()]).optional(),
  letterSpacing: z.union([z.number(), z.string()]).optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  textDecoration: z.enum(['none', 'underline', 'line-through']).optional(),
  color: z.string().optional(),
});

export type TypographyValue = z.infer<typeof typographySchema>;

/* =========================================================================
   2. Border & Radius Schema & Types
   ========================================================================= */

export const borderSideBoxSchema = z.object({
  top: z.union([z.number(), z.string()]).optional(),
  right: z.union([z.number(), z.string()]).optional(),
  bottom: z.union([z.number(), z.string()]).optional(),
  left: z.union([z.number(), z.string()]).optional(),
});

export const borderRadiusBoxSchema = z.object({
  topLeft: z.union([z.number(), z.string()]).optional(),
  topRight: z.union([z.number(), z.string()]).optional(),
  bottomRight: z.union([z.number(), z.string()]).optional(),
  bottomLeft: z.union([z.number(), z.string()]).optional(),
});

export const borderSchema = z.object({
  style: z.enum(['none', 'solid', 'dashed', 'dotted', 'double']).optional(),
  width: z.union([z.number(), z.string(), borderSideBoxSchema]).optional(),
  color: z.string().optional(),
  radius: z.union([z.number(), z.string(), borderRadiusBoxSchema]).optional(),
});

export type BorderSideBox = z.infer<typeof borderSideBoxSchema>;
export type BorderRadiusBox = z.infer<typeof borderRadiusBoxSchema>;
export type BorderValue = z.infer<typeof borderSchema>;

/* =========================================================================
   3. Shadow Schema & Types (Box & Text)
   ========================================================================= */

export const shadowItemSchema = z.object({
  id: z.string().optional(),
  x: z.number().default(0),
  y: z.number().default(0),
  blur: z.number().min(0).default(0),
  spread: z.number().default(0).optional(),
  color: z.string().default('rgba(0, 0, 0, 0.2)'),
  inset: z.boolean().default(false).optional(),
});

export type ShadowItem = z.infer<typeof shadowItemSchema>;

export const shadowSchema = z.union([
  shadowItemSchema,
  z.array(shadowItemSchema),
]);

export type ShadowValue = z.infer<typeof shadowSchema>;

/* =========================================================================
   4. Background Schema & Types (Color, Gradient, Image)
   ========================================================================= */

export const gradientStopSchema = z.object({
  id: z.string().optional(),
  color: z.string(),
  offset: z.number().min(0).max(100),
});

export type GradientStop = z.infer<typeof gradientStopSchema>;

export const gradientConfigSchema = z.object({
  type: z.enum(['linear', 'radial']).default('linear'),
  angle: z.number().min(0).max(360).default(90),
  stops: z.array(gradientStopSchema).min(1).default([
    { color: '#3b82f6', offset: 0 },
    { color: '#8b5cf6', offset: 100 },
  ]),
});

export type GradientConfig = z.infer<typeof gradientConfigSchema>;

export const backgroundImageConfigSchema = z.object({
  url: z.string().optional(),
  position: z.string().optional(),
  size: z.enum(['cover', 'contain', 'auto']).optional(),
  repeat: z.enum(['no-repeat', 'repeat', 'repeat-x', 'repeat-y']).optional(),
});

export type BackgroundImageConfig = z.infer<typeof backgroundImageConfigSchema>;

export const backgroundSchema = z.object({
  type: z.enum(['color', 'gradient', 'image']).default('color'),
  color: z.string().optional(),
  gradient: gradientConfigSchema.optional(),
  image: backgroundImageConfigSchema.optional(),
});

export type BackgroundValue = z.infer<typeof backgroundSchema>;

/* =========================================================================
   5. Flex Container & Alignment Schema & Types
   ========================================================================= */

export const alignmentValueSchema = z.object({
  justify: z.enum(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly']).default('start'),
  align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).default('start'),
});

export type AlignmentValue = z.infer<typeof alignmentValueSchema>;

export const flexContainerSchema = z.object({
  display: z.enum(['flex', 'inline-flex']).default('flex'),
  direction: z.enum(['row', 'column', 'row-reverse', 'column-reverse']).default('row'),
  wrap: z.enum(['nowrap', 'wrap', 'wrap-reverse']).default('nowrap'),
  justifyContent: z.enum(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly']).default('start'),
  alignItems: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).default('start'),
  gap: z.union([z.number(), z.string()]).optional(),
  rowGap: z.union([z.number(), z.string()]).optional(),
  columnGap: z.union([z.number(), z.string()]).optional(),
});

export type FlexContainerValue = z.infer<typeof flexContainerSchema>;

/* =========================================================================
   6. CSS Whitelist & Allowlisted Property Mapper
   ========================================================================= */

/** Strict allowlist of CSS properties that group controls are permitted to generate. */
export const ALLOWED_CSS_PROPERTIES = new Set<string>([
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
  'textDecoration',
  'color',
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'borderColor',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'boxShadow',
  'textShadow',
  'backgroundColor',
  'backgroundImage',
  'backgroundSize',
  'backgroundPosition',
  'backgroundRepeat',
  'display',
  'flexDirection',
  'flexWrap',
  'justifyContent',
  'alignItems',
  'gap',
  'rowGap',
  'columnGap',
]);

/** Format a number or string into a valid CSS unit (defaults to px for pure numbers). */
function toCssUnit(val: number | string | undefined): string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return `${val}px`;
  return String(val);
}

/**
 * Validate that a CSS property value does not contain injection vectors
 * (e.g., javascript:, expression, url with data/html, @import, semicolons, brackets).
 */
export function sanitizeCssValue(value: string): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Block dangerous expressions or injection attempts
  if (
    /javascript:/i.test(trimmed) ||
    /expression\s*\(/i.test(trimmed) ||
    /@import/i.test(trimmed) ||
    /[<>{}\\]/.test(trimmed)
  ) {
    return null;
  }

  // Prevent breaking out of declaration with raw semicolons
  if (trimmed.includes(';')) {
    return null;
  }

  return trimmed;
}

/** Filter and sanitize an object of CSS declarations against the allowlist. */
export function filterAllowedCss(styles: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [prop, val] of Object.entries(styles)) {
    if (!ALLOWED_CSS_PROPERTIES.has(prop)) continue;
    if (val === undefined || val === null) continue;
    const sanitized = sanitizeCssValue(String(val));
    if (sanitized !== null) {
      result[prop] = sanitized;
    }
  }
  return result;
}

/* =========================================================================
   7. Style Value to CSS Mappers
   ========================================================================= */

export function typographyToCSS(value?: TypographyValue | null): Record<string, string> {
  if (!value) return {};
  const raw: Record<string, string | undefined> = {};

  if (value.fontFamily) raw.fontFamily = value.fontFamily;
  if (value.fontSize !== undefined) raw.fontSize = toCssUnit(value.fontSize);
  if (value.fontWeight !== undefined) raw.fontWeight = String(value.fontWeight);
  if (value.lineHeight !== undefined) {
    // If unitless number like 1.5, keep unitless; if string with px/rem/% keep it
    raw.lineHeight = typeof value.lineHeight === 'number' && value.lineHeight <= 5
      ? String(value.lineHeight)
      : toCssUnit(value.lineHeight);
  }
  if (value.letterSpacing !== undefined) raw.letterSpacing = toCssUnit(value.letterSpacing);
  if (value.textAlign) raw.textAlign = value.textAlign;
  if (value.textTransform) raw.textTransform = value.textTransform;
  if (value.textDecoration) raw.textDecoration = value.textDecoration;
  if (value.color) raw.color = value.color;

  return filterAllowedCss(raw);
}

export function borderToCSS(value?: BorderValue | null): Record<string, string> {
  if (!value) return {};
  const raw: Record<string, string | undefined> = {};

  if (value.style) raw.borderStyle = value.style;
  if (value.color) raw.borderColor = value.color;

  if (value.width !== undefined) {
    if (typeof value.width === 'number' || typeof value.width === 'string') {
      raw.borderWidth = toCssUnit(value.width);
    } else {
      const w = value.width;
      if (w.top !== undefined) raw.borderTopWidth = toCssUnit(w.top);
      if (w.right !== undefined) raw.borderRightWidth = toCssUnit(w.right);
      if (w.bottom !== undefined) raw.borderBottomWidth = toCssUnit(w.bottom);
      if (w.left !== undefined) raw.borderLeftWidth = toCssUnit(w.left);
    }
  }

  if (value.radius !== undefined) {
    if (typeof value.radius === 'number' || typeof value.radius === 'string') {
      raw.borderRadius = toCssUnit(value.radius);
    } else {
      const r = value.radius;
      if (r.topLeft !== undefined) raw.borderTopLeftRadius = toCssUnit(r.topLeft);
      if (r.topRight !== undefined) raw.borderTopRightRadius = toCssUnit(r.topRight);
      if (r.bottomRight !== undefined) raw.borderBottomRightRadius = toCssUnit(r.bottomRight);
      if (r.bottomLeft !== undefined) raw.borderBottomLeftRadius = toCssUnit(r.bottomLeft);
    }
  }

  return filterAllowedCss(raw);
}

function formatSingleShadow(item: ShadowItem, type: 'box' | 'text' = 'box'): string {
  const parts: string[] = [];
  if (type === 'box' && item.inset) parts.push('inset');
  parts.push(`${item.x}px`);
  parts.push(`${item.y}px`);
  parts.push(`${item.blur}px`);
  if (type === 'box' && item.spread !== undefined) {
    parts.push(`${item.spread}px`);
  }
  parts.push(item.color);
  return parts.join(' ');
}

export function shadowToCSS(
  value?: ShadowValue | null,
  type: 'box' | 'text' = 'box'
): Record<string, string> {
  if (!value) return {};
  const items = Array.isArray(value) ? value : [value];
  if (items.length === 0) return {};

  const propName = type === 'text' ? 'textShadow' : 'boxShadow';
  const shadowString = items.map(it => formatSingleShadow(it, type)).join(', ');

  return filterAllowedCss({ [propName]: shadowString });
}

export function backgroundToCSS(value?: BackgroundValue | null): Record<string, string> {
  if (!value) return {};
  const raw: Record<string, string | undefined> = {};

  if (value.type === 'color' && value.color) {
    raw.backgroundColor = value.color;
  } else if (value.type === 'gradient' && value.gradient) {
    const { type = 'linear', angle = 90, stops = [] } = value.gradient;
    const sortedStops = [...stops].sort((a, b) => a.offset - b.offset);
    const stopStr = sortedStops.map(s => `${s.color} ${s.offset}%`).join(', ');

    if (type === 'radial') {
      raw.backgroundImage = `radial-gradient(circle, ${stopStr})`;
    } else {
      raw.backgroundImage = `linear-gradient(${angle}deg, ${stopStr})`;
    }
  } else if (value.type === 'image' && value.image) {
    if (value.image.url) raw.backgroundImage = `url("${value.image.url}")`;
    if (value.image.size) raw.backgroundSize = value.image.size;
    if (value.image.position) raw.backgroundPosition = value.image.position;
    if (value.image.repeat) raw.backgroundRepeat = value.image.repeat;
  }

  return filterAllowedCss(raw);
}

const JUSTIFY_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
  'space-around': 'space-around',
  'space-evenly': 'space-evenly',
};

const ALIGN_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

export function flexContainerToCSS(value?: FlexContainerValue | null): Record<string, string> {
  if (!value) return {};
  const raw: Record<string, string | undefined> = {
    display: value.display ?? 'flex',
    flexDirection: value.direction ?? 'row',
    flexWrap: value.wrap ?? 'nowrap',
  };

  if (value.justifyContent) {
    raw.justifyContent = JUSTIFY_MAP[value.justifyContent] ?? value.justifyContent;
  }
  if (value.alignItems) {
    raw.alignItems = ALIGN_MAP[value.alignItems] ?? value.alignItems;
  }
  if (value.gap !== undefined) raw.gap = toCssUnit(value.gap);
  if (value.rowGap !== undefined) raw.rowGap = toCssUnit(value.rowGap);
  if (value.columnGap !== undefined) raw.columnGap = toCssUnit(value.columnGap);

  return filterAllowedCss(raw);
}
