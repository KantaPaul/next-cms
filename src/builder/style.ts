import type { CSSProperties } from 'react';

/*
 * Section style and motion settings stored in page JSON.
 * Every value is read through an allowlist or a validator, so stored data never becomes a raw class name or CSS string.
 */

export type Device = 'desktop' | 'tablet' | 'mobile';
export const DEVICES: Device[] = ['desktop', 'tablet', 'mobile'];
export const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 768, mobile: 375 };
export const deviceForWidth = (width: number): Device => (width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile');

export type Side = 'top' | 'right' | 'bottom' | 'left';
export const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];
export type Sides = Partial<Record<Side, number>>;
export type Responsive<T> = Partial<Record<Device, T>>;

export type MaybeResponsive<T> = T | Responsive<T>;

export type ShadowSettings = {
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
  color?: string;
  opacity?: number;
  inset?: boolean;
};

export type SpacingUnit = 'px' | 'rem' | 'em' | '%';
export const SPACING_UNITS: readonly SpacingUnit[] = ['px', 'rem', 'em', '%'] as const;

export const SPACING_LIMITS: Record<SpacingUnit, { min: number; max: number; step: number }> = {
  px: { min: 0, max: 400, step: 1 },
  rem: { min: 0, max: 25, step: 0.25 },
  em: { min: 0, max: 25, step: 0.25 },
  '%': { min: 0, max: 50, step: 1 },
};

export type Fill = {
  type?: 'color' | 'gradient' | 'image';
  color?: string;
  colorDark?: string;
  from?: string;
  to?: string;
  angle?: number;
  start?: number;
  end?: number;
  gradientType?: 'linear' | 'radial';
  attachment?: 'scroll' | 'fixed';
  posX?: number;
  posY?: number;
  image?: string;
  size?: 'cover' | 'contain' | 'auto';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
};

export type BorderSettings = {
  style?: 'none' | 'solid' | 'dashed' | 'double' | 'dotted' | 'groove';
  color?: string;
  width?: Responsive<Sides>;
  radius?: Responsive<number>;
  radiusUnit?: LengthUnit;
};

export const BORDER_STYLES = ['solid', 'dashed', 'double', 'dotted', 'groove'] as const;

export type LengthUnit = 'px' | 'rem' | 'em' | '%' | 'vw';
export const LENGTH_UNITS: readonly LengthUnit[] = ['px', 'rem', 'em', '%', 'vw'] as const;
type Limits = { min: number; max: number; step: number };
export const LENGTH_LIMITS: Record<LengthUnit, Limits> = {
  px: { min: 0, max: 200, step: 1 },
  rem: { min: 0, max: 12, step: 0.1 },
  em: { min: 0, max: 12, step: 0.1 },
  '%': { min: 0, max: 100, step: 1 },
  vw: { min: 0, max: 100, step: 0.5 },
};
export const SIGNED_LENGTH_LIMITS: Record<LengthUnit, Limits> = {
  px: { min: -50, max: 50, step: 1 },
  rem: { min: -5, max: 5, step: 0.1 },
  em: { min: -5, max: 5, step: 0.1 },
  '%': { min: -50, max: 50, step: 1 },
  vw: { min: -20, max: 20, step: 0.5 },
};
/** Units each unit-slider property accepts. */
export const PROP_UNITS = {
  fontSize: ['px', 'rem', 'em', 'vw'],
  lineHeight: ['em', 'px', 'rem'],
  letterSpacing: ['px', 'em', 'rem'],
  wordSpacing: ['px', 'em', 'rem'],
  width: ['%', 'px', 'vw'],
  radius: ['px', 'rem', '%'],
} as const satisfies Record<string, readonly LengthUnit[]>;

export type FilterSettings = {
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  hue?: number;
};

export type TextShadowSettings = { x?: number; y?: number; blur?: number; color?: string };
export type TextStrokeSettings = { width?: number; color?: string };

export type HoverSettings = {
  textColor?: string;
  fillColor?: string;
  borderColor?: string;
  shadow?: ShadowSettings;
  filter?: FilterSettings;
};

export const FONT_FAMILIES = ['Inter', 'Plus Jakarta Sans', 'JetBrains Mono', 'System'] as const;
export const TEXT_TRANSFORMS = ['none', 'uppercase', 'lowercase', 'capitalize'] as const;
export const FONT_STYLES = ['normal', 'italic', 'oblique'] as const;
export const TEXT_DECORATIONS = ['none', 'underline', 'overline', 'line-through'] as const;

export type Typography = {
  size?: MaybeResponsive<'' | 'sm' | 'md' | 'lg' | 'xl'>;
  weight?: MaybeResponsive<'' | 'regular' | 'medium' | 'bold'>;
  family?: (typeof FONT_FAMILIES)[number];
  /** Unit-based size; wins over the legacy `size` preset when set. */
  fontSize?: Responsive<number>;
  fontSizeUnit?: LengthUnit;
  transform?: (typeof TEXT_TRANSFORMS)[number];
  fontStyle?: (typeof FONT_STYLES)[number];
  decoration?: (typeof TEXT_DECORATIONS)[number];
  lineHeight?: Responsive<number>;
  lineHeightUnit?: LengthUnit;
  letterSpacing?: Responsive<number>;
  letterSpacingUnit?: LengthUnit;
  wordSpacing?: Responsive<number>;
  wordSpacingUnit?: LengthUnit;
  textShadow?: TextShadowSettings;
  textStroke?: TextStrokeSettings;
};

export type DisplaySettings = {
  minHeight?: MaybeResponsive<'auto' | 'half' | 'screen'>;
  contentAlign?: MaybeResponsive<'start' | 'center' | 'end'>;
};

export const ENTRANCES = ['none', 'fade', 'fade-up', 'fade-down', 'slide-left', 'slide-right', 'zoom', 'blur'] as const;
export const TRIGGERS = ['load', 'scroll', 'hover', 'click'] as const;
export const HOVERS = ['none', 'lift', 'scale', 'glow'] as const;
export const EASINGS = ['ease-out', 'spring'] as const;
export const PAGE_TRANSITIONS = ['none', 'fade', 'slide-up'] as const;

export type Entrance = (typeof ENTRANCES)[number];
export type Trigger = (typeof TRIGGERS)[number];
export type HoverEffect = (typeof HOVERS)[number];
export type Easing = (typeof EASINGS)[number];
export type PageTransition = (typeof PAGE_TRANSITIONS)[number];

export type AnimationSettings = {
  entrance?: Entrance;
  trigger?: Trigger;
  duration?: number;
  delay?: number;
  easing?: Easing;
  once?: boolean;
  stagger?: 'none' | 'children';
  hover?: HoverEffect;
  devices?: Partial<Record<Device, boolean>>;
};

export const DURATION_RANGE = { min: 0.2, max: 1.2, step: 0.1, fallback: 0.6 };
export const DELAY_RANGE = { min: 0, max: 0.8, step: 0.1, fallback: 0 };

export const DEFAULT_ANIMATION: Required<AnimationSettings> = {
  entrance: 'none',
  trigger: 'scroll',
  duration: DURATION_RANGE.fallback,
  delay: DELAY_RANGE.fallback,
  easing: 'ease-out',
  once: true,
  stagger: 'none',
  hover: 'none',
  devices: { desktop: true, tablet: true, mobile: true },
};

export type SectionSettings = {
  paddingY?: 'none' | 'sm' | 'md' | 'lg';
  background?: 'default' | 'muted' | 'primary' | 'dark';
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  hideOnDesktop?: boolean;
  anchor?: string;
  spacing?: Responsive<Sides>;
  spacingUnit?: SpacingUnit;
  align?: MaybeResponsive<'' | 'left' | 'center' | 'right'>;
  fill?: Fill;
  textColor?: string;
  typography?: Typography;
  border?: BorderSettings;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | ShadowSettings;
  display?: DisplaySettings;
  animation?: AnimationSettings;
  filter?: FilterSettings;
  hover?: HoverSettings;
  margin?: Responsive<Sides>;
  marginUnit?: SpacingUnit;
  width?: Responsive<number>;
  widthUnit?: LengthUnit;
  zIndex?: number;
};

/* ---------- validators ---------- */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const SAFE_URL = /^(?:https?:\/\/|\/)[^\s"'()\\<>]+$/i;

export const safeColor = (value: unknown) => (typeof value === 'string' && HEX.test(value) ? value : undefined);
export const safeUrl = (value: unknown) => (typeof value === 'string' && SAFE_URL.test(value) ? value : undefined);

export const clamp = (value: unknown, min: number, max: number) => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
};

export const pick = <T extends string>(value: unknown, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, '');

  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }

  if (clean.length === 6 || clean.length === 8) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }

  return null;
}

export function formatShadow(shadow: ShadowSettings): string | null {
  const x = clamp(shadow.x, -50, 50) ?? 0;
  const y = clamp(shadow.y, -50, 50) ?? 0;
  const blur = clamp(shadow.blur, 0, 100) ?? 0;
  const spread = clamp(shadow.spread, -50, 50) ?? 0;
  const opacity = clamp(shadow.opacity, 0, 1) ?? 1;
  const color = safeColor(shadow.color) ?? '#000000';
  const rgb = hexToRgb(color) ?? { r: 0, g: 0, b: 0 };
  const colorWithAlpha = `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${opacity})`;
  return `${shadow.inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${colorWithAlpha}`;
}

export function formatFilter(f: FilterSettings | undefined): string | null {
  if (!f) return null;
  const parts: string[] = [];
  const blur = clamp(f.blur, 0, 10);
  const brightness = clamp(f.brightness, 0, 200);
  const contrast = clamp(f.contrast, 0, 200);
  const saturate = clamp(f.saturate, 0, 200);
  const hue = clamp(f.hue, 0, 360);
  if (blur !== undefined) parts.push(`blur(${blur}px)`);
  if (brightness !== undefined) parts.push(`brightness(${brightness}%)`);
  if (contrast !== undefined) parts.push(`contrast(${contrast}%)`);
  if (saturate !== undefined) parts.push(`saturate(${saturate}%)`);
  if (hue !== undefined) parts.push(`hue-rotate(${hue}deg)`);
  return parts.length ? parts.join(' ') : null;
}

function formatTextShadow(t: TextShadowSettings | undefined): string | null {
  if (!t || typeof t !== 'object') return null;
  const x = clamp(t.x, -50, 50) ?? 0;
  const y = clamp(t.y, -50, 50) ?? 0;
  const blur = clamp(t.blur, 0, 100) ?? 0;
  const color = safeColor(t.color) ?? '#000000';
  return `${x}px ${y}px ${blur}px ${color}`;
}

/* ---------- responsive resolution ---------- */

const DEVICE_ORDER: Record<Device, Device[]> = {
  desktop: ['desktop', 'tablet', 'mobile'],
  tablet: ['tablet', 'desktop', 'mobile'],
  mobile: ['mobile', 'tablet', 'desktop'],
};
const DEVICE_SUFFIX: Record<Device, string> = { desktop: 'd', tablet: 't', mobile: 'm' };
const SIDE_SUFFIX: Record<Side, string> = { top: 't', right: 'r', bottom: 'b', left: 'l' };

export function resolveResponsive<T>(
  v: MaybeResponsive<T> | undefined,
  device: Device,
  valid: (x: unknown) => T | undefined
): T | undefined {
  if (v === undefined || v === null) return undefined;

  if (typeof v === 'object' && !Array.isArray(v)) {
    const resp = v as Partial<Record<Device, unknown>>;

    for (const d of DEVICE_ORDER[device]) {
      const parsed = valid(resp[d]);
      if (parsed !== undefined) return parsed;
    }

    return undefined;
  }

  return valid(v);
}

/** Resolves a side for a device, falling back to the nearest device that sets it. */
const resolveSide = (value: Responsive<Sides> | undefined, device: Device, side: Side, max: number) => {
  for (const d of DEVICE_ORDER[device]) {
    const n = clamp(value?.[d]?.[side], 0, max);
    if (n !== undefined) return n;
  }

  return undefined;
};

/** Emits `--s-{prefix}{side}-{device}` variables plus one class per side that has any value. */
function responsiveSides(value: Responsive<Sides> | undefined, prefix: 'p' | 'b' | 'm', max: number, unit = 'px') {
  const classes: string[] = [];
  const vars: Record<string, string> = {};

  for (const side of SIDES) {
    if (resolveSide(value, 'desktop', side, max) === undefined) continue;
    classes.push(`s-${prefix}${SIDE_SUFFIX[side]}`);

    for (const device of DEVICES) {
      vars[`--s-${prefix}${SIDE_SUFFIX[side]}-${DEVICE_SUFFIX[device]}`] = `${resolveSide(value, device, side, max)}${unit}`;
    }
  }

  return { classes, vars };
}

/** Emits `--s-{name}-{device}` values for a responsive number plus a unit; returns true when any device has a value. */
function responsiveLength(
  value: Responsive<number> | undefined,
  unit: unknown,
  allowed: readonly LengthUnit[],
  signed: boolean,
  name: string,
  style: Record<string, string>
): boolean {
  if (!value || typeof value !== 'object') return false;
  const u = pick(unit, allowed) ?? allowed[0];
  const lim = (signed ? SIGNED_LENGTH_LIMITS : LENGTH_LIMITS)[u];
  const get = (device: Device) => {
    for (const d of DEVICE_ORDER[device]) {
      const n = clamp(value[d], lim.min, lim.max);
      if (n !== undefined) return n;
    }
    return undefined;
  };
  if (!DEVICES.some(d => get(d) !== undefined)) return false;

  for (const d of DEVICES) {
    const n = get(d);
    if (n !== undefined) style[`--s-${name}-${DEVICE_SUFFIX[d]}`] = `${n}${u}`;
  }

  return true;
}

/* ---------- fill ---------- */

function fillValue(fill: Fill | undefined) {
  if (!fill?.type) return null;

  if (fill.type === 'color') {
    const color = safeColor(fill.color);
    if (!color) return null;
    return { light: color, dark: safeColor(fill.colorDark) ?? color };
  }

  if (fill.type === 'gradient') {
    const from = safeColor(fill.from) ?? '#6366f1';
    const to = safeColor(fill.to) ?? '#ec4899';
    const angle = clamp(fill.angle, 0, 360) ?? 135;
    const start = clamp(fill.start, 0, 100) ?? 0;
    const end = clamp(fill.end, 0, 100) ?? 100;
    const value =
      fill.gradientType === 'radial'
        ? `radial-gradient(circle, ${from} ${start}%, ${to} ${end}%)`
        : `linear-gradient(${angle}deg, ${from} ${start}%, ${to} ${end}%)`;
    return { light: value, dark: value };
  }

  const url = safeUrl(fill.image);
  if (!url) return null;
  const size = pick(fill.size, ['cover', 'contain', 'auto'] as const) ?? 'cover';
  const posX = clamp(fill.posX, 0, 100);
  const posY = clamp(fill.posY, 0, 100);
  const position =
    posX !== undefined || posY !== undefined
      ? `${posX ?? 50}% ${posY ?? 50}%`
      : (pick(fill.position, ['center', 'top', 'bottom', 'left', 'right'] as const) ?? 'center');
  const attachment = pick(fill.attachment, ['scroll', 'fixed'] as const) ?? 'scroll';
  const repeat = pick(fill.repeat, ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'] as const) ?? 'no-repeat';
  const value = `url("${url}") ${position} / ${size} ${repeat} ${attachment}`;
  return { light: value, dark: value };
}

/* ---------- class maps & constants ---------- */

const SHADOW = { none: '', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-xl' };
const FONT_STACK: Record<(typeof FONT_FAMILIES)[number], string> = {
  Inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  'Plus Jakarta Sans': "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  'JetBrains Mono': "'JetBrains Mono', ui-monospace, monospace",
  System: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
};
const FONT_SIZE_REM: Record<string, string> = { sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' };
const FONT_WEIGHT_MAP: Record<string, string> = { regular: '400', medium: '500', bold: '700' };
const TEXT_ALIGN_MAP: Record<string, string> = { left: 'left', center: 'center', right: 'right' };
const MIN_HEIGHT_MAP: Record<string, string> = { auto: 'auto', half: '50vh', screen: '100vh' };
const JUSTIFY_MAP: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end' };

export type ResolvedSectionStyle = {
  outerClasses: string[];
  innerClasses: string[];
  style: CSSProperties;
  hasFill: boolean;
};

/** Turns stored section settings into allowlisted classes and validated CSS variables. */
export function resolveSectionStyle(s: SectionSettings): ResolvedSectionStyle {
  const outerClasses: string[] = [];
  const innerClasses: string[] = [];
  const style: Record<string, string> = {};

  const spacingUnit = pick(s.spacingUnit, SPACING_UNITS) ?? 'px';
  const maxSpacing = SPACING_LIMITS[spacingUnit].max;
  const spacing = responsiveSides(s.spacing, 'p', maxSpacing, spacingUnit);
  outerClasses.push(...spacing.classes);
  Object.assign(style, spacing.vars);

  const fill = fillValue(s.fill);

  if (fill) {
    outerClasses.push('s-fill');
    style['--s-fill'] = fill.light;
    style['--s-fill-dark'] = fill.dark;
  }

  const textColor = safeColor(s.textColor);
  if (textColor) style.color = textColor;

  const ty = s.typography;
  const unitSize = responsiveLength(ty?.fontSize, ty?.fontSizeUnit, PROP_UNITS.fontSize, false, 'fs', style);
  if (unitSize) outerClasses.push('s-fs');

  // Typography size (responsive, legacy presets)
  const hasSize = !unitSize && DEVICES.some(
    d => resolveResponsive(s.typography?.size, d, x => pick(x, ['sm', 'md', 'lg', 'xl'] as const)) !== undefined
  );

  if (hasSize) {
    outerClasses.push('s-fs');

    for (const d of DEVICES) {
      const resolved = resolveResponsive(s.typography?.size, d, x => pick(x, ['sm', 'md', 'lg', 'xl'] as const));

      if (resolved) {
        style[`--s-fs-${DEVICE_SUFFIX[d]}`] = FONT_SIZE_REM[resolved];
      }
    }
  }

  if (responsiveLength(ty?.lineHeight, ty?.lineHeightUnit, PROP_UNITS.lineHeight, false, 'lh', style)) outerClasses.push('s-lh');
  if (responsiveLength(ty?.letterSpacing, ty?.letterSpacingUnit, PROP_UNITS.letterSpacing, true, 'ls', style)) outerClasses.push('s-ls');
  if (responsiveLength(ty?.wordSpacing, ty?.wordSpacingUnit, PROP_UNITS.wordSpacing, true, 'ws', style)) outerClasses.push('s-ws');

  const family = pick(ty?.family, FONT_FAMILIES);
  if (family) {
    outerClasses.push('s-ff');
    style['--s-ff'] = FONT_STACK[family];
  }
  const transform = pick(ty?.transform, TEXT_TRANSFORMS);
  if (transform && transform !== 'none') outerClasses.push(`s-tt-${transform}`);
  const fontStyle = pick(ty?.fontStyle, FONT_STYLES);
  if (fontStyle && fontStyle !== 'normal') outerClasses.push(`s-fst-${fontStyle}`);
  const decoration = pick(ty?.decoration, TEXT_DECORATIONS);
  if (decoration && decoration !== 'none') outerClasses.push(`s-td-${decoration}`);
  const textShadow = formatTextShadow(ty?.textShadow);
  if (textShadow) {
    outerClasses.push('s-tsh');
    style['--s-tsh'] = textShadow;
  }
  const strokeWidth = clamp(ty?.textStroke?.width, 0, 10);
  if (strokeWidth) {
    outerClasses.push('s-tst');
    style['--s-tst'] = `${strokeWidth}px ${safeColor(ty?.textStroke?.color) ?? '#000000'}`;
  }

  // Typography weight (responsive)
  const hasWeight = DEVICES.some(
    d => resolveResponsive(s.typography?.weight, d, x => pick(x, ['regular', 'medium', 'bold'] as const)) !== undefined
  );

  if (hasWeight) {
    outerClasses.push('s-fw');

    for (const d of DEVICES) {
      const resolved = resolveResponsive(s.typography?.weight, d, x => pick(x, ['regular', 'medium', 'bold'] as const));

      if (resolved) {
        style[`--s-fw-${DEVICE_SUFFIX[d]}`] = FONT_WEIGHT_MAP[resolved];
      }
    }
  }

  const borderStyle = pick(s.border?.style, ['none', ...BORDER_STYLES] as const);

  if (borderStyle && borderStyle !== 'none') {
    const widths = responsiveSides(s.border?.width, 'b', 40, 'px');

    if (widths.classes.length) {
      outerClasses.push(`s-bd-${borderStyle}`, ...widths.classes);
      Object.assign(style, widths.vars);
      const color = safeColor(s.border?.color);
      if (color) style['--s-bd-color'] = color;
    }
  }

  if (borderStyle) {
    const radius = s.border;
    if (responsiveLength(radius?.radius, radius?.radiusUnit, PROP_UNITS.radius, false, 'rad', style)) outerClasses.push('s-rad');
  }

  // Shadow (structured object or legacy string)
  if (typeof s.shadow === 'string') {
    const legacy = pick(s.shadow, ['none', 'sm', 'md', 'lg'] as const);
    if (legacy && legacy !== 'none') outerClasses.push(SHADOW[legacy]);
  } else if (s.shadow && typeof s.shadow === 'object') {
    const shadowVal = formatShadow(s.shadow);

    if (shadowVal) {
      outerClasses.push('s-shadow');
      style['--s-shadow'] = shadowVal;
    }
  }

  // CSS filters
  const filter = formatFilter(s.filter);
  if (filter) {
    outerClasses.push('s-filter');
    style['--s-filter'] = filter;
  }

  // Hover overrides (applied by `.s-hover:hover`)
  const h = s.hover;
  if (h && typeof h === 'object') {
    const hv: Record<string, string> = {};
    const hc = safeColor(h.textColor);
    if (hc) hv['--s-h-color'] = hc;
    const hf = safeColor(h.fillColor);
    if (hf) hv['--s-h-fill'] = hf;
    const hb = safeColor(h.borderColor);
    if (hb) hv['--s-h-bd'] = hb;
    const hs = h.shadow && typeof h.shadow === 'object' ? formatShadow(h.shadow) : null;
    if (hs) hv['--s-h-shadow'] = hs;
    const hfl = formatFilter(h.filter);
    if (hfl) hv['--s-h-filter'] = hfl;

    const HOVER_CLASS: Record<string, string> = {
      '--s-h-color': 's-hc',
      '--s-h-fill': 's-hf',
      '--s-h-bd': 's-hb',
      '--s-h-shadow': 's-hs',
      '--s-h-filter': 's-hfl',
    };
    for (const key of Object.keys(hv)) outerClasses.push(HOVER_CLASS[key]);
    Object.assign(style, hv);
  }

  // Margin (responsive, same units as padding)
  const marginUnit = pick(s.marginUnit, SPACING_UNITS) ?? 'px';
  const margin = responsiveSides(s.margin, 'm', SPACING_LIMITS[marginUnit].max, marginUnit);
  outerClasses.push(...margin.classes);
  Object.assign(style, margin.vars);

  // Width (responsive) and z-index
  if (responsiveLength(s.width, s.widthUnit, PROP_UNITS.width, false, 'w', style)) outerClasses.push('s-w');
  const z = clamp(s.zIndex, 0, 50);
  if (z !== undefined) {
    outerClasses.push('s-z');
    style['--s-z'] = String(Math.round(z));
  }

  // Text align (responsive)
  const hasAlign = DEVICES.some(
    d => resolveResponsive(s.align, d, x => pick(x, ['left', 'center', 'right'] as const)) !== undefined
  );

  if (hasAlign) {
    innerClasses.push('s-ta');

    for (const d of DEVICES) {
      const resolved = resolveResponsive(s.align, d, x => pick(x, ['left', 'center', 'right'] as const));

      if (resolved) {
        style[`--s-ta-${DEVICE_SUFFIX[d]}`] = TEXT_ALIGN_MAP[resolved];
      }
    }
  }

  // Minimum height (responsive)
  const hasMinHeight = DEVICES.some(d => {
    const r = resolveResponsive(s.display?.minHeight, d, x => pick(x, ['auto', 'half', 'screen'] as const));
    return r && r !== 'auto';
  });

  if (hasMinHeight) {
    outerClasses.push('s-mh', 'flex', 'flex-col');

    for (const d of DEVICES) {
      const resolved = resolveResponsive(s.display?.minHeight, d, x => pick(x, ['auto', 'half', 'screen'] as const));
      style[`--s-mh-${DEVICE_SUFFIX[d]}`] = resolved ? MIN_HEIGHT_MAP[resolved] : 'auto';
    }
  }

  // Content alignment (responsive)
  const hasContentAlign = DEVICES.some(
    d => resolveResponsive(s.display?.contentAlign, d, x => pick(x, ['start', 'center', 'end'] as const)) !== undefined
  );

  if (hasContentAlign || hasMinHeight) {
    outerClasses.push('s-jc');

    for (const d of DEVICES) {
      const resolved = resolveResponsive(s.display?.contentAlign, d, x => pick(x, ['start', 'center', 'end'] as const)) ?? 'center';
      style[`--s-jc-${DEVICE_SUFFIX[d]}`] = JUSTIFY_MAP[resolved];
    }
  }

  return { outerClasses: outerClasses.filter(Boolean), innerClasses, style: style as CSSProperties, hasFill: !!fill };
}

/* ---------- animation ---------- */

export type ResolvedAnimation = Required<Omit<AnimationSettings, 'devices'>> & { devices: Record<Device, boolean> };

/** Returns sanitized animation settings, or null when the block neither enters nor reacts to hover. */
export function resolveAnimation(a: AnimationSettings | undefined): ResolvedAnimation | null {
  if (!a) return null;
  const entrance = pick(a.entrance, ENTRANCES) ?? 'none';
  const hover = pick(a.hover, HOVERS) ?? 'none';
  if (entrance === 'none' && hover === 'none') return null;
  return {
    entrance,
    hover,
    trigger: pick(a.trigger, TRIGGERS) ?? DEFAULT_ANIMATION.trigger,
    duration: clamp(a.duration, DURATION_RANGE.min, DURATION_RANGE.max) ?? DURATION_RANGE.fallback,
    delay: clamp(a.delay, DELAY_RANGE.min, DELAY_RANGE.max) ?? DELAY_RANGE.fallback,
    easing: pick(a.easing, EASINGS) ?? DEFAULT_ANIMATION.easing,
    once: a.once !== false,
    stagger: a.stagger === 'children' ? 'children' : 'none',
    devices: {
      desktop: a.devices?.desktop !== false,
      tablet: a.devices?.tablet !== false,
      mobile: a.devices?.mobile !== false,
    },
  };
}
