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

export {
  ATTENTION_SEEKERS,
  ENTRANCE_ALIASES,
  ENTRANCE_CLASS,
  ENTRANCE_GROUPS,
  ENTRANCES,
  EXIT_CLASS,
  EXIT_GROUPS,
  EXITS,
  HOVER_ALIASES,
  HOVER_CLASS,
  HOVER_GROUPS,
  HOVERS,
} from './animation-catalog';

import {
  ENTRANCE_ALIASES,
  ENTRANCES,
  EXITS,
  HOVER_ALIASES,
  HOVERS,
} from './animation-catalog';

export const TRIGGERS = ['load', 'scroll', 'hover', 'click'] as const;
export const EASINGS = ['ease-out', 'spring'] as const;
export const PAGE_TRANSITIONS = ['none', 'fade', 'slide-up'] as const;

export type Entrance = (typeof ENTRANCES)[number];
export type Exit = (typeof EXITS)[number];
export type Trigger = (typeof TRIGGERS)[number];
export type HoverEffect = (typeof HOVERS)[number];
export type Easing = (typeof EASINGS)[number];
export type PageTransition = (typeof PAGE_TRANSITIONS)[number];

export type AnimationSettings = {
  entrance?: Entrance | string;
  exit?: Exit | string;
  trigger?: Trigger;
  duration?: number;
  delay?: number;
  easing?: Easing;
  once?: boolean;
  stagger?: 'none' | 'children';
  hover?: HoverEffect | string;
  devices?: Partial<Record<Device, boolean>>;
};

export const DURATION_RANGE = { min: 0.2, max: 1.2, step: 0.1, fallback: 0.6 };
export const DELAY_RANGE = { min: 0, max: 0.8, step: 0.1, fallback: 0 };

export const DEFAULT_ANIMATION = {
  entrance: 'none' as Entrance,
  exit: 'none' as Exit,
  trigger: 'scroll' as Trigger,
  duration: DURATION_RANGE.fallback,
  delay: DELAY_RANGE.fallback,
  easing: 'ease-out' as Easing,
  once: true,
  stagger: 'none' as const,
  hover: 'none' as HoverEffect,
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

/* ---------- URL helpers (shared, server-safe) ---------- */

export type UrlValue = string | { url?: string; newTab?: boolean; nofollow?: boolean };

export function normalizeUrlValue(value: unknown): { url: string; newTab: boolean; nofollow: boolean } {
  if (typeof value === 'string') return { url: value, newTab: false, nofollow: false };
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return {
      url: typeof o.url === 'string' ? o.url : '',
      newTab: !!o.newTab,
      nofollow: !!o.nofollow,
    };
  }
  return { url: '', newTab: false, nofollow: false };
}

export function resolveLinkProps(value: unknown): { href: string; target?: string; rel?: string } {
  const n = normalizeUrlValue(value);
  const href = n.url || '#';
  if (!n.newTab && !n.nofollow) return { href };
  return {
    href,
    ...(n.newTab ? { target: '_blank' } : {}),
    rel: [n.newTab ? 'noopener noreferrer' : '', n.nofollow ? 'nofollow' : ''].filter(Boolean).join(' ') || undefined,
  };
}

/* ---------- validators ---------- */

export function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function clamp(n: unknown, min: number, max: number): number | undefined {
  if (typeof n !== 'number' || Number.isNaN(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

export function safeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(v)) return v;
  if (/^hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(,\s*[\d.]+\s*)?\)$/.test(v)) return v;
  return undefined;
}

export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (v.startsWith('/') || v.startsWith('#') || v.startsWith('mailto:') || v.startsWith('tel:')) return v;
  try {
    const u = new URL(v);
    if (u.protocol === 'http:' || u.protocol === 'https:') return v;
  } catch {
    /* ignore */
  }
  return undefined;
}

/* ---------- resolve section style ---------- */

const PADDING_Y = { none: '', sm: 'py-8', md: 'py-16', lg: 'py-24' } as const;
const BACKGROUND = {
  default: '',
  muted: 's-bg-muted',
  primary: 's-bg-primary',
  dark: 's-bg-dark',
} as const;

export function resolveSectionStyle(s: SectionSettings | undefined): {
  outerClasses: string[];
  innerClasses: string;
  style: CSSProperties;
  hasFill: boolean;
} {
  if (!s) return { outerClasses: [], innerClasses: '', style: {}, hasFill: false };

  const outerClasses: string[] = [];
  const style: Record<string, string | number> = {};
  let innerClasses = '';
  let hasFill = false;

  // Legacy paddingY when spacing is not set
  if (!s.spacing && s.paddingY && s.paddingY !== 'none') {
    /* padding applied by Section via PADDING map */
  }

  // Align
  const align = typeof s.align === 'string' ? s.align : s.align?.desktop;
  if (align === 'left') innerClasses = 'text-left';
  else if (align === 'center') innerClasses = 'text-center';
  else if (align === 'right') innerClasses = 'text-right';

  // Text color
  const textColor = safeColor(s.textColor);
  if (textColor) style['--s-text' as string] = textColor;

  // Fill
  const fill = s.fill;
  if (fill?.type === 'color' && safeColor(fill.color)) {
    hasFill = true;
    style.backgroundColor = safeColor(fill.color)!;
    if (safeColor(fill.colorDark)) style['--s-fill-dark' as string] = safeColor(fill.colorDark)!;
  } else if (fill?.type === 'gradient' && safeColor(fill.from) && safeColor(fill.to)) {
    hasFill = true;
    const angle = clamp(fill.angle, 0, 360) ?? 135;
    const start = clamp(fill.start, 0, 100) ?? 0;
    const end = clamp(fill.end, 0, 100) ?? 100;
    if (fill.gradientType === 'radial') {
      style.backgroundImage = `radial-gradient(circle, ${safeColor(fill.from)} ${start}%, ${safeColor(fill.to)} ${end}%)`;
    } else {
      style.backgroundImage = `linear-gradient(${angle}deg, ${safeColor(fill.from)} ${start}%, ${safeColor(fill.to)} ${end}%)`;
    }
  } else if (fill?.type === 'image' && safeUrl(fill.image)) {
    hasFill = true;
    style.backgroundImage = `url(${safeUrl(fill.image)})`;
    style.backgroundSize = fill.size ?? 'cover';
    style.backgroundPosition = fill.position ?? 'center';
    style.backgroundRepeat = fill.repeat ?? 'no-repeat';
    if (fill.attachment === 'fixed') style.backgroundAttachment = 'fixed';
  }

  // Spacing (padding)
  const unit = pick(s.spacingUnit, SPACING_UNITS) ?? 'px';
  const limits = SPACING_LIMITS[unit];
  if (s.spacing) {
    for (const device of DEVICES) {
      const sides = s.spacing[device];
      if (!sides) continue;
      const prefix = device === 'desktop' ? '' : device === 'tablet' ? 'md:' : 'sm:';
      for (const side of SIDES) {
        const v = clamp(sides[side], limits.min, limits.max);
        if (v === undefined) continue;
        const prop = side === 'top' ? 'padding-top' : side === 'right' ? 'padding-right' : side === 'bottom' ? 'padding-bottom' : 'padding-left';
        style[`--s-${device}-pad-${side}` as string] = `${v}${unit}`;
      }
    }
  }

  // Margin
  const mUnit = pick(s.marginUnit, SPACING_UNITS) ?? 'px';
  const mLimits = SPACING_LIMITS[mUnit];
  if (s.margin) {
    for (const device of DEVICES) {
      const sides = s.margin[device];
      if (!sides) continue;
      for (const side of SIDES) {
        const v = clamp(sides[side], mLimits.min, mLimits.max);
        if (v === undefined) continue;
        style[`--s-${device}-margin-${side}` as string] = `${v}${mUnit}`;
      }
    }
  }

  // Width
  const wUnit = pick(s.widthUnit, LENGTH_UNITS) ?? '%';
  const wLimits = LENGTH_LIMITS[wUnit];
  if (s.width) {
    for (const device of DEVICES) {
      const v = clamp(s.width[device], wLimits.min, wLimits.max);
      if (v === undefined) continue;
      style[`--s-${device}-width` as string] = `${v}${wUnit}`;
    }
  }

  // z-index
  const z = clamp(s.zIndex, -10, 100);
  if (z !== undefined) style.zIndex = z;

  // Typography (CSS vars)
  const ty = s.typography;
  if (ty) {
    if (ty.family && (FONT_FAMILIES as readonly string[]).includes(ty.family)) {
      style['--s-font-family' as string] =
        ty.family === 'System' ? 'system-ui, sans-serif' : `"${ty.family}", sans-serif`;
    }
    if (ty.transform && (TEXT_TRANSFORMS as readonly string[]).includes(ty.transform)) {
      style.textTransform = ty.transform;
    }
    if (ty.fontStyle && (FONT_STYLES as readonly string[]).includes(ty.fontStyle)) {
      style.fontStyle = ty.fontStyle;
    }
    if (ty.decoration && (TEXT_DECORATIONS as readonly string[]).includes(ty.decoration)) {
      style.textDecoration = ty.decoration;
    }
  }

  // Border
  const border = s.border;
  if (border) {
    const bs = border.style && border.style !== 'none' ? border.style : undefined;
    if (bs && (BORDER_STYLES as readonly string[]).includes(bs)) {
      style.borderStyle = bs;
      const bc = safeColor(border.color);
      if (bc) style.borderColor = bc;
    }
  }

  // Shadow presets
  if (typeof s.shadow === 'string') {
    if (s.shadow === 'sm') outerClasses.push('shadow-sm');
    else if (s.shadow === 'md') outerClasses.push('shadow-md');
    else if (s.shadow === 'lg') outerClasses.push('shadow-lg');
  } else if (s.shadow && typeof s.shadow === 'object') {
    const sh = s.shadow;
    const x = clamp(sh.x, -50, 50) ?? 0;
    const y = clamp(sh.y, -50, 50) ?? 4;
    const blur = clamp(sh.blur, 0, 100) ?? 16;
    const spread = clamp(sh.spread, -50, 50) ?? 0;
    const col = safeColor(sh.color) ?? 'rgba(0,0,0,0.12)';
    style.boxShadow = `${sh.inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${col}`;
  }

  // Filter
  if (s.filter) {
    const parts: string[] = [];
    const bl = clamp(s.filter.blur, 0, 20);
    const br = clamp(s.filter.brightness, 0, 200);
    const ct = clamp(s.filter.contrast, 0, 200);
    const sat = clamp(s.filter.saturate, 0, 200);
    const hue = clamp(s.filter.hue, 0, 360);
    if (bl) parts.push(`blur(${bl}px)`);
    if (br !== undefined && br !== 100) parts.push(`brightness(${br}%)`);
    if (ct !== undefined && ct !== 100) parts.push(`contrast(${ct}%)`);
    if (sat !== undefined && sat !== 100) parts.push(`saturate(${sat}%)`);
    if (hue) parts.push(`hue-rotate(${hue}deg)`);
    if (parts.length) style.filter = parts.join(' ');
  }

  return { outerClasses: outerClasses.filter(Boolean), innerClasses, style: style as CSSProperties, hasFill };
}

/* ---------- animation ---------- */

export type ResolvedAnimation = {
  entrance: Entrance;
  exit: Exit;
  hover: HoverEffect;
  trigger: Trigger;
  duration: number;
  delay: number;
  easing: Easing;
  once: boolean;
  stagger: 'none' | 'children';
  devices: Record<Device, boolean>;
};

function resolveEntranceKey(raw: unknown): Entrance {
  if (typeof raw !== 'string') return 'none';
  const aliased = ENTRANCE_ALIASES[raw] ?? raw;
  return pick(aliased, ENTRANCES) ?? 'none';
}

function resolveExitKey(raw: unknown): Exit {
  if (typeof raw !== 'string') return 'none';
  return pick(raw, EXITS) ?? 'none';
}

function resolveHoverKey(raw: unknown): HoverEffect {
  if (typeof raw !== 'string') return 'none';
  const aliased = HOVER_ALIASES[raw] ?? raw;
  return pick(aliased, HOVERS) ?? 'none';
}

/** Returns sanitized animation settings, or null when entrance, exit, and hover are all none. */
export function resolveAnimation(a: AnimationSettings | undefined): ResolvedAnimation | null {
  if (!a) return null;
  const entrance = resolveEntranceKey(a.entrance);
  const exit = resolveExitKey(a.exit);
  const hover = resolveHoverKey(a.hover);
  if (entrance === 'none' && exit === 'none' && hover === 'none') return null;
  return {
    entrance,
    exit,
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
