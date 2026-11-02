import type { CSSProperties } from 'react';
import {
  FONT_FAMILIES as CURATED_FONT_FAMILIES,
  FONT_STACK as CURATED_FONT_STACK,
  getFontStack,
} from './fonts';

/*
 * Section style and motion settings stored in page JSON.
 * Every value is read through an allowlist or a validator.
 */

export type Device = 'desktop' | 'tablet' | 'mobile';
export const DEVICES: Device[] = ['desktop', 'tablet', 'mobile'];
export const DEVICE_WIDTH: Record<Device, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};
export const deviceForWidth = (width: number): Device =>
  width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile';

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
export const SPACING_UNITS: readonly SpacingUnit[] = [
  'px',
  'rem',
  'em',
  '%',
] as const;
export const SPACING_LIMITS: Record<
  SpacingUnit,
  { min: number; max: number; step: number }
> = {
  px: { min: 0, max: 400, step: 1 },
  rem: { min: 0, max: 25, step: 0.25 },
  em: { min: 0, max: 25, step: 0.25 },
  '%': { min: 0, max: 50, step: 1 },
};

export type Fill = {
  type?: 'color' | 'gradient' | 'image' | 'video';
  color?: string;
  colorDark?: string;
  from?: string;
  to?: string;
  angle?: number;
  start?: number;
  end?: number;
  gradientType?: 'linear' | 'radial';
  gradientPosition?: string;
  attachment?: 'scroll' | 'fixed';
  posX?: number;
  posY?: number;
  image?: string;
  size?: MaybeResponsive<string>;
  position?: MaybeResponsive<string>;
  repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  videoUrl?: string;
  videoFallback?: string;
};

export type ImageSizePreset = 'thumbnail' | 'medium' | 'large' | 'full' | 'custom';

export type ImageSize = {
  size?: ImageSizePreset;
  width?: number;
  height?: number;
};

export const IMAGE_SIZE_PRESETS: Record<
  Exclude<ImageSizePreset, 'full' | 'custom'>,
  { width: number; height: number }
> = {
  thumbnail: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 1024, height: 1024 },
};

export function resolveImageSize(
  imageSize?: ImageSize,
  originalUrl?: string
): {
  width?: number;
  height?: number;
  src: string;
  sizes?: string;
} {
  const src = originalUrl ?? '';
  if (!imageSize || !imageSize.size || imageSize.size === 'full') {
    return { src, width: undefined, height: undefined };
  }

  let width: number | undefined;
  let height: number | undefined;

  if (imageSize.size === 'custom') {
    width = imageSize.width;
    height = imageSize.height;
  } else if (IMAGE_SIZE_PRESETS[imageSize.size]) {
    width = IMAGE_SIZE_PRESETS[imageSize.size].width;
    height = IMAGE_SIZE_PRESETS[imageSize.size].height;
  }

  let transformedSrc = src;
  if (src && (width !== undefined || height !== undefined)) {
    try {
      const isRelative = src.startsWith('/') || !src.includes('://');
      const url = new URL(src, 'http://localhost');
      if (width !== undefined) url.searchParams.set('w', String(width));
      if (height !== undefined) url.searchParams.set('h', String(height));
      transformedSrc = isRelative ? `${url.pathname}${url.search}` : url.toString();
    } catch {
      transformedSrc = src;
    }
  }

  const sizes = width ? `(max-width: ${width}px) 100vw, ${width}px` : undefined;

  return {
    width,
    height,
    src: transformedSrc,
    sizes,
  };
}

export type LengthUnit = 'px' | 'rem' | 'em' | '%' | 'vw' | 'vh';
export const LENGTH_UNITS: readonly LengthUnit[] = [
  'px',
  'rem',
  'em',
  '%',
  'vw',
  'vh',
] as const;
type Limits = { min: number; max: number; step: number };
export const LENGTH_LIMITS: Record<LengthUnit, Limits> = {
  px: { min: 0, max: 200, step: 1 },
  rem: { min: 0, max: 12, step: 0.1 },
  em: { min: 0, max: 12, step: 0.1 },
  '%': { min: 0, max: 100, step: 1 },
  vw: { min: 0, max: 100, step: 0.5 },
  vh: { min: 0, max: 100, step: 0.5 },
};
export const SIGNED_LENGTH_LIMITS: Record<LengthUnit, Limits> = {
  px: { min: -50, max: 50, step: 1 },
  rem: { min: -5, max: 5, step: 0.1 },
  em: { min: -5, max: 5, step: 0.1 },
  '%': { min: -50, max: 50, step: 1 },
  vw: { min: -20, max: 20, step: 0.5 },
  vh: { min: -100, max: 100, step: 0.5 },
};
export const PROP_UNITS = {
  fontSize: ['px', 'rem', 'em', 'vw'],
  lineHeight: ['em', 'px', 'rem'],
  letterSpacing: ['px', 'em', 'rem'],
  wordSpacing: ['px', 'em', 'rem'],
  width: ['%', 'px', 'vw'],
  radius: ['px', 'rem', '%'],
} as const satisfies Record<string, readonly LengthUnit[]>;

export type BorderSettings = {
  style?: 'none' | 'solid' | 'dashed' | 'double' | 'dotted' | 'groove';
  color?: string;
  width?: Responsive<Sides>;
  radius?: Responsive<number>;
  radiusUnit?: LengthUnit;
};
export const BORDER_STYLES = [
  'solid',
  'dashed',
  'double',
  'dotted',
  'groove',
] as const;

export type FilterSettings = {
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  grayscale?: number;
  hue?: number;
  hueRotate?: number;
};

export type TextShadowSettings = {
  x?: number;
  y?: number;
  blur?: number;
  color?: string;
};
export type TextStrokeSettings = { width?: MaybeResponsive<number>; color?: string };
export type HoverSettings = {
  fill?: Fill;
  textColor?: string;
  borderColor?: string;
  opacity?: number;
  scale?: number;
  shadow?: ShadowSettings;
  filter?: FilterSettings;
};

export type ElementHoverStyle = {
  color?: string;
  fill?: Fill | string;
  borderColor?: string;
  shadow?: ShadowSettings;
  filter?: FilterSettings;
};

export type ElementStyle = {
  color?: string;
  typography?: Typography;
  textStroke?: TextStrokeSettings;
  textShadow?: TextShadowSettings;
  fill?: Fill | string;
  border?: BorderSettings;
  shadow?: ShadowSettings | 'none' | 'sm' | 'md' | 'lg';
  padding?: Responsive<Sides>;
  paddingUnit?: SpacingUnit;
  margin?: Responsive<Sides>;
  marginUnit?: SpacingUnit;
  filter?: FilterSettings;
  imageSize?: ImageSize;
  hover?: ElementHoverStyle;
};

export const FONT_FAMILIES = CURATED_FONT_FAMILIES;
export const FONT_STACK = CURATED_FONT_STACK;
export { getFontStack };

export const TEXT_TRANSFORMS = [
  'none',
  'uppercase',
  'lowercase',
  'capitalize',
] as const;
export const FONT_STYLES = ['normal', 'italic', 'oblique'] as const;
export const TEXT_DECORATIONS = [
  'none',
  'underline',
  'overline',
  'line-through',
] as const;

export type Typography = {
  size?: MaybeResponsive<'' | 'sm' | 'md' | 'lg' | 'xl'>;
  weight?: MaybeResponsive<'' | 'regular' | 'medium' | 'bold' | number | string>;
  family?: string;
  fontStyle?: (typeof FONT_STYLES)[number];
  fontSize?: Responsive<number>;
  fontSizeUnit?: LengthUnit;
  fontWeight?: number;
  transform?: (typeof TEXT_TRANSFORMS)[number];
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
  overflow?: 'visible' | 'hidden' | 'auto';
  minHeight?: MaybeResponsive<'auto' | 'half' | 'screen'>;
  contentAlign?: MaybeResponsive<'start' | 'center' | 'end'>;
  zIndex?: number;
};

export {
  ENTRANCES,
  EXITS,
  HOVERS,
  ENTRANCE_CLASS,
  EXIT_CLASS,
  HOVER_CLASS,
  ATTENTION_SEEKERS,
} from './animation-catalog';
import type { ENTRANCES, EXITS, HOVERS } from './animation-catalog';

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
  entrance?: Entrance | 'none' | '';
  exit?: Exit | 'none' | '';
  trigger?: Trigger;
  duration?: number;
  delay?: number;
  easing?: Easing;
  once?: boolean;
  stagger?: number;
  hover?: HoverEffect | 'none' | '';
  devices?: Partial<Record<Device, boolean>>;
};

export const DURATION_RANGE = { min: 0.2, max: 5, step: 0.1, fallback: 0.6 };
export const DELAY_RANGE = { min: 0, max: 5, step: 0.1, fallback: 0 };

/* ---------- Per-child layout settings (flex item / grid item) ----------

These live on every block's `section` settings and only take effect when the
block is a direct child of a Container (flex or grid). Outside a container
they have no visual impact, so they are safe to store on legacy blocks.
*/

export type AlignSelf = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

export const ALIGN_SELF_VALUES: AlignSelf[] = [
  'start',
  'center',
  'end',
  'stretch',
  'baseline',
];

export type FlexChildSettings = {
  grow?: Responsive<number>;
  shrink?: Responsive<number>;
  basis?: Responsive<number>;
  basisUnit?: LengthUnit;
  alignSelf?: Responsive<AlignSelf>;
  order?: Responsive<number>;
};

export type GridChildSettings = {
  columnStart?: Responsive<number>;
  columnSpan?: Responsive<number>;
  rowStart?: Responsive<number>;
  rowSpan?: Responsive<number>;
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
  flexItem?: FlexChildSettings;
  gridItem?: GridChildSettings;
};

/* ---------- Container layout settings (R394, R396–R399, R668–R669) ----------

Stored on the Container block. Every numeric value is clamped on read and every
track string is validated, so persisted layout data can never inject arbitrary
CSS.
*/

export type ContainerTag =
  | 'div'
  | 'section'
  | 'article'
  | 'header'
  | 'footer'
  | 'aside'
  | 'nav'
  | 'main';

export const CONTAINER_TAGS: ContainerTag[] = [
  'div',
  'section',
  'article',
  'header',
  'footer',
  'aside',
  'nav',
  'main',
];

/** Landmark tags that should occur at most once per page. */
export const LANDMARK_TAGS: ContainerTag[] = ['main', 'nav'];

export type LayoutMode = 'flex' | 'grid';
export const LAYOUT_MODES: LayoutMode[] = ['flex', 'grid'];

export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export const FLEX_DIRECTIONS: FlexDirection[] = [
  'row',
  'row-reverse',
  'column',
  'column-reverse',
];

export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export const FLEX_WRAPS: FlexWrap[] = ['nowrap', 'wrap', 'wrap-reverse'];

export type JustifyContent =
  'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
export const JUSTIFY_CONTENTS: JustifyContent[] = [
  'start',
  'center',
  'end',
  'between',
  'around',
  'evenly',
];

export type AlignItems = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export const ALIGN_ITEMS_VALUES: AlignItems[] = [
  'start',
  'center',
  'end',
  'stretch',
  'baseline',
];

export type AlignContent =
  'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
export const ALIGN_CONTENTS: AlignContent[] = [
  'start',
  'center',
  'end',
  'between',
  'around',
  'evenly',
];

export type GridAutoFlow = 'row' | 'row-dense' | 'column' | 'column-dense';
export const GRID_AUTO_FLOWS: GridAutoFlow[] = [
  'row',
  'row-dense',
  'column',
  'column-dense',
];

export type ContentWidth = 'full' | 'boxed';
export const CONTENT_WIDTHS: ContentWidth[] = ['full', 'boxed'];

export type ContainerSettings = {
  tag?: ContainerTag;
  mode?: LayoutMode;
  direction?: Responsive<FlexDirection>;
  wrap?: Responsive<FlexWrap>;
  justify?: Responsive<JustifyContent>;
  alignItems?: Responsive<AlignItems>;
  alignContent?: Responsive<AlignContent>;
  gap?: Responsive<number>;
  gapUnit?: LengthUnit;
  columnGap?: Responsive<number>;
  rowGap?: Responsive<number>;
  width?: Responsive<number>;
  minWidth?: Responsive<number>;
  maxWidth?: Responsive<number>;
  height?: Responsive<number>;
  minHeight?: Responsive<number>;
  maxHeight?: Responsive<number>;
  sizeUnit?: LengthUnit;
  grow?: Responsive<number>;
  shrink?: Responsive<number>;
  basis?: Responsive<number>;
  basisUnit?: LengthUnit;
  boxSizing?: MaybeResponsive<'border-box' | 'content-box'>;
  gridTemplateColumns?: Responsive<string>;
  gridTemplateRows?: Responsive<string>;
  gridAutoFlow?: Responsive<GridAutoFlow>;
  contentWidth?: ContentWidth;
  boxedWidth?: Responsive<number>;
  link?: UrlValue;
};

export const DEFAULT_CONTAINER: ContainerSettings = {
  mode: 'flex',
  tag: 'div',
  direction: { desktop: 'row' },
  wrap: { desktop: 'nowrap' },
  justify: { desktop: 'start' },
  alignItems: { desktop: 'stretch' },
  alignContent: { desktop: 'start' },
  boxSizing: 'border-box',
};

export type ResolvedContainerStyle = {
  classes: string[];
  style: CSSProperties;
};

export type UrlValue =
  string | { url?: string; newTab?: boolean; nofollow?: boolean };

export function normalizeUrlValue(value: UrlValue | undefined): {
  url: string;
  newTab: boolean;
  nofollow: boolean;
} {
  if (!value) return { url: '', newTab: false, nofollow: false };
  if (typeof value === 'string')
    return { url: value, newTab: false, nofollow: false };
  return {
    url: typeof value.url === 'string' ? value.url : '',
    newTab: !!value.newTab,
    nofollow: !!value.nofollow,
  };
}

export function resolveLinkProps(value: unknown): {
  href: string;
  target?: string;
  rel?: string;
} {
  const n = normalizeUrlValue(value as UrlValue | undefined);
  const href = n.url || '#';
  if (!n.newTab && !n.nofollow) return { href };
  return {
    href,
    ...(n.newTab ? { target: '_blank' } : {}),
    rel:
      [n.newTab ? 'noopener noreferrer' : '', n.nofollow ? 'nofollow' : '']
        .filter(Boolean)
        .join(' ') || undefined,
  };
}

export function pick<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined {
  return typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export function clamp(
  n: unknown,
  min: number,
  max: number
): number | undefined {
  if (typeof n !== 'number' || Number.isNaN(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

export function safeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(v))
    return v;
  if (
    /^hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(,\s*[\d.]+\s*)?\)$/.test(
      v
    )
  )
    return v;
  // Theme variable reference, e.g. var(--site-color-primary)
  if (/^var\(--[a-zA-Z0-9_-]+\)$/.test(v)) return v;
  return undefined;
}

export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (
    v.startsWith('/') ||
    v.startsWith('#') ||
    v.startsWith('mailto:') ||
    v.startsWith('tel:')
  )
    return v;

  try {
    const u = new URL(v);
    if (u.protocol === 'http:' || u.protocol === 'https:') return v;
  } catch {
    /* ignore */
  }

  return undefined;
}

export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
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
  const colorWithAlpha = color.startsWith('var(')
    ? `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`
    : `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${opacity})`;
  return `${shadow.inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${colorWithAlpha}`;
}

export function formatFilter(f: FilterSettings | undefined): string | null {
  if (!f) return null;
  const parts: string[] = [];
  const blur = clamp(f.blur, 0, 10);
  const brightness = clamp(f.brightness, 0, 200);
  const contrast = clamp(f.contrast, 0, 200);
  const saturate = clamp(f.saturate, 0, 200);
  const grayscale = clamp(f.grayscale, 0, 100);
  const hue = clamp(f.hueRotate ?? f.hue, 0, 360);
  if (blur !== undefined) parts.push(`blur(${blur}px)`);
  if (brightness !== undefined) parts.push(`brightness(${brightness}%)`);
  if (contrast !== undefined) parts.push(`contrast(${contrast}%)`);
  if (saturate !== undefined) parts.push(`saturate(${saturate}%)`);
  if (grayscale !== undefined) parts.push(`grayscale(${grayscale}%)`);
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

const DEVICE_ORDER: Record<Device, Device[]> = {
  desktop: ['desktop', 'tablet', 'mobile'],
  tablet: ['tablet', 'desktop', 'mobile'],
  mobile: ['mobile', 'tablet', 'desktop'],
};
const DEVICE_SUFFIX: Record<Device, string> = {
  desktop: 'd',
  tablet: 't',
  mobile: 'm',
};
const SIDE_SUFFIX: Record<Side, string> = {
  top: 't',
  right: 'r',
  bottom: 'b',
  left: 'l',
};

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

const resolveSide = (
  value: Responsive<Sides> | undefined,
  device: Device,
  side: Side,
  max: number
) => {
  for (const d of DEVICE_ORDER[device]) {
    const n = clamp(value?.[d]?.[side], 0, max);
    if (n !== undefined) return n;
  }

  return undefined;
};

function responsiveSides(
  value: Responsive<Sides> | undefined,
  prefix: 'p' | 'b' | 'm',
  max: number,
  unit = 'px'
) {
  const classes: string[] = [];
  const vars: Record<string, string> = {};

  for (const side of SIDES) {
    if (resolveSide(value, 'desktop', side, max) === undefined) continue;
    classes.push(`s-${prefix}${SIDE_SUFFIX[side]}`);

    for (const device of DEVICES) {
      vars[`--s-${prefix}${SIDE_SUFFIX[side]}-${DEVICE_SUFFIX[device]}`] =
        `${resolveSide(value, device, side, max)}${unit}`;
    }
  }

  return { classes, vars };
}

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
  const lim = signed ? SIGNED_LENGTH_LIMITS[u] : LENGTH_LIMITS[u];
  let any = false;

  for (const d of DEVICES) {
    const n = clamp(value[d], lim.min, lim.max);

    if (n !== undefined) {
      style[`--s-${name}-${DEVICE_SUFFIX[d]}`] = `${n}${u}`;
      any = true;
    }
  }

  return any;
}

export function fillValue(fill: Fill | undefined) {
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
    const pos = fill.gradientPosition ? ` at ${fill.gradientPosition}` : '';
    const value =
      fill.gradientType === 'radial'
        ? `radial-gradient(circle${pos}, ${from} ${start}%, ${to} ${end}%)`
        : `linear-gradient(${angle}deg, ${from} ${start}%, ${to} ${end}%)`;
    return { light: value, dark: value };
  }

  if (fill.type === 'video') {
    if (fill.videoFallback) {
      const fb = safeUrl(fill.videoFallback);
      if (fb) return { light: `url("${fb}") center / cover no-repeat`, dark: `url("${fb}") center / cover no-repeat` };
    }
    return null;
  }

  const url = safeUrl(fill.image);
  if (!url) return null;
  const rawSize = typeof fill.size === 'string' ? fill.size : (fill.size?.desktop ?? 'cover');
  const size =
    pick(rawSize, ['cover', 'contain', 'auto'] as const) ?? (rawSize || 'cover');
  const posX = clamp(fill.posX, 0, 100);
  const posY = clamp(fill.posY, 0, 100);
  const rawPos = typeof fill.position === 'string' ? fill.position : (fill.position?.desktop ?? 'center');
  const position =
    posX !== undefined || posY !== undefined
      ? `${posX ?? 50}% ${posY ?? 50}%`
      : (pick(rawPos, [
          'center',
          'top',
          'bottom',
          'left',
          'right',
        ] as const) ?? (rawPos || 'center'));
  const attachment =
    pick(fill.attachment, ['scroll', 'fixed'] as const) ?? 'scroll';
  const repeat =
    pick(fill.repeat, [
      'no-repeat',
      'repeat',
      'repeat-x',
      'repeat-y',
    ] as const) ?? 'no-repeat';
  const value = `url("${url}") ${position} / ${size} ${repeat} ${attachment}`;
  return { light: value, dark: value };
}

const SHADOW = { none: '', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-xl' };

export function resolveFontWeight(val: unknown): string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') {
    if (val >= 100 && val <= 900) return String(Math.round(val));
    return undefined;
  }
  const s = String(val).trim().toLowerCase();
  if (FONT_WEIGHT_MAP[s]) return FONT_WEIGHT_MAP[s];
  const num = parseInt(s, 10);
  if (!Number.isNaN(num) && num >= 100 && num <= 900) return String(num);
  return undefined;
}
const FONT_SIZE_REM: Record<string, string> = {
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
};
const FONT_WEIGHT_MAP: Record<string, string> = {
  regular: '400',
  medium: '500',
  bold: '700',
};
const TEXT_ALIGN_MAP: Record<string, string> = {
  left: 'left',
  center: 'center',
  right: 'right',
};
const MIN_HEIGHT_MAP: Record<string, string> = {
  auto: 'auto',
  half: '50vh',
  screen: '100vh',
};
const JUSTIFY_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
};

export type ResolvedSectionStyle = {
  outerClasses: string[];
  innerClasses: string[];
  style: CSSProperties;
  hasFill: boolean;
};

export function resolveSectionStyle(
  s: SectionSettings | undefined
): ResolvedSectionStyle {
  if (!s)
    return { outerClasses: [], innerClasses: [], style: {}, hasFill: false };

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
  const unitSize = responsiveLength(
    ty?.fontSize,
    ty?.fontSizeUnit,
    PROP_UNITS.fontSize,
    false,
    'fs',
    style
  );
  if (unitSize) outerClasses.push('s-fs');

  const hasSize =
    !unitSize &&
    DEVICES.some(
      d =>
        resolveResponsive(s.typography?.size, d, x =>
          pick(x, ['sm', 'md', 'lg', 'xl'] as const)
        ) !== undefined
    );

  if (hasSize) {
    outerClasses.push('s-fs');

    for (const d of DEVICES) {
      const resolved = resolveResponsive(s.typography?.size, d, x =>
        pick(x, ['sm', 'md', 'lg', 'xl'] as const)
      );
      if (resolved)
        style[`--s-fs-${DEVICE_SUFFIX[d]}`] = FONT_SIZE_REM[resolved];
    }
  }

  if (
    responsiveLength(
      ty?.lineHeight,
      ty?.lineHeightUnit,
      PROP_UNITS.lineHeight,
      false,
      'lh',
      style
    )
  )
    outerClasses.push('s-lh');
  if (
    responsiveLength(
      ty?.letterSpacing,
      ty?.letterSpacingUnit,
      PROP_UNITS.letterSpacing,
      true,
      'ls',
      style
    )
  )
    outerClasses.push('s-ls');
  if (
    responsiveLength(
      ty?.wordSpacing,
      ty?.wordSpacingUnit,
      PROP_UNITS.wordSpacing,
      true,
      'ws',
      style
    )
  )
    outerClasses.push('s-ws');

  const family = ty?.family;

  if (family) {
    outerClasses.push('s-ff');
    style['--s-ff'] = getFontStack(family);
  }

  const transform = pick(ty?.transform, TEXT_TRANSFORMS);
  if (transform && transform !== 'none') outerClasses.push(`s-tt-${transform}`);
  const fontStyle = pick(ty?.fontStyle, FONT_STYLES);
  if (fontStyle && fontStyle !== 'normal')
    outerClasses.push(`s-fst-${fontStyle}`);
  const decoration = pick(ty?.decoration, TEXT_DECORATIONS);
  if (decoration && decoration !== 'none')
    outerClasses.push(`s-td-${decoration}`);

  const textShadow = formatTextShadow(ty?.textShadow);

  if (textShadow) {
    outerClasses.push('s-tsh');
    style['--s-tsh'] = textShadow;
  }

  const hasWeight =
    (typeof ty?.fontWeight === 'number' && ty.fontWeight >= 100 && ty.fontWeight <= 900) ||
    DEVICES.some(
      d => resolveResponsive(ty?.weight, d, resolveFontWeight) !== undefined
    );

  if (hasWeight) {
    outerClasses.push('s-fw');

    for (const d of DEVICES) {
      const resolved =
        resolveResponsive(ty?.weight, d, resolveFontWeight) ??
        (ty?.fontWeight ? String(ty.fontWeight) : undefined);
      if (resolved)
        style[`--s-fw-${DEVICE_SUFFIX[d]}`] = String(resolved);
    }
  }

  if (s.fill?.type === 'image') {
    if (typeof s.fill.position === 'object' && s.fill.position !== null) {
      outerClasses.push('s-bg-pos');
      for (const d of DEVICES) {
        const pos = resolveResponsive(
          s.fill.position,
          d,
          v => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
        );
        if (pos) style[`--s-bg-pos-${DEVICE_SUFFIX[d]}`] = pos;
      }
    }
    if (typeof s.fill.size === 'object' && s.fill.size !== null) {
      outerClasses.push('s-bg-size');
      for (const d of DEVICES) {
        const sz = resolveResponsive(
          s.fill.size,
          d,
          v => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
        );
        if (sz) style[`--s-bg-size-${DEVICE_SUFFIX[d]}`] = sz;
      }
    }
    if (s.fill.attachment) {
      outerClasses.push('s-bg-attach');
      style['--s-bg-attach'] = s.fill.attachment;
    }
    if (s.fill.repeat) {
      outerClasses.push('s-bg-repeat');
      style['--s-bg-repeat'] = s.fill.repeat;
    }
  }

  // Border
  if (s.border) {
    const bs = pick(s.border.style, [
      'none',
      'solid',
      'dashed',
      'double',
      'dotted',
      'groove',
    ] as const);

    if (bs && bs !== 'none') {
      outerClasses.push('s-bd');
      style['--s-bd-style'] = bs;
      const bc = safeColor(s.border.color);
      if (bc) style['--s-bd-color'] = bc;
      const bw = responsiveSides(s.border.width, 'b', 40, 'px');
      outerClasses.push(...bw.classes);
      Object.assign(style, bw.vars);
    }

    if (
      responsiveLength(
        s.border.radius,
        s.border.radiusUnit,
        PROP_UNITS.radius,
        false,
        'br',
        style
      )
    )
      outerClasses.push('s-br');
  }

  // Shadow: structured object or legacy preset string
  if (s.shadow && typeof s.shadow === 'object') {
    const css = formatShadow(s.shadow);

    if (css) {
      outerClasses.push('s-shadow');
      style['--s-shadow'] = css;
    }
  } else if (typeof s.shadow === 'string' && s.shadow !== 'none') {
    const cls = SHADOW[s.shadow as keyof typeof SHADOW];
    if (cls) outerClasses.push(cls);
  }

  const filterCss = formatFilter(s.filter);

  if (filterCss) {
    outerClasses.push('s-filter');
    style['--s-filter'] = filterCss;
  }

  // Margin
  const marginUnit = pick(s.marginUnit, SPACING_UNITS) ?? 'px';
  const margin = responsiveSides(
    s.margin,
    'm',
    SPACING_LIMITS[marginUnit].max,
    marginUnit
  );
  outerClasses.push(...margin.classes);
  Object.assign(style, margin.vars);

  // Width + z-index
  if (
    responsiveLength(s.width, s.widthUnit, PROP_UNITS.width, false, 'w', style)
  )
    outerClasses.push('s-w');
  const z = clamp(s.zIndex, 0, 50);

  if (z !== undefined && z > 0) {
    outerClasses.push('s-z');
    style['--s-z'] = String(z);
  }

  // Text alignment (responsive)
  const hasAlign = DEVICES.some(
    d =>
      resolveResponsive(s.align, d, x =>
        pick(x, ['left', 'center', 'right'] as const)
      ) !== undefined
  );

  if (hasAlign) {
    outerClasses.push('s-ta');

    for (const d of DEVICES) {
      const resolved = resolveResponsive(s.align, d, x =>
        pick(x, ['left', 'center', 'right'] as const)
      );
      if (resolved)
        style[`--s-ta-${DEVICE_SUFFIX[d]}`] = TEXT_ALIGN_MAP[resolved];
    }
  }

  // Min height (responsive)
  const hasMinHeight = DEVICES.some(d => {
    const r = resolveResponsive(s.display?.minHeight, d, x =>
      pick(x, ['auto', 'half', 'screen'] as const)
    );
    return r && r !== 'auto';
  });

  if (hasMinHeight) {
    outerClasses.push('s-mh', 'flex', 'flex-col');

    for (const d of DEVICES) {
      const resolved = resolveResponsive(s.display?.minHeight, d, x =>
        pick(x, ['auto', 'half', 'screen'] as const)
      );
      style[`--s-mh-${DEVICE_SUFFIX[d]}`] = resolved
        ? MIN_HEIGHT_MAP[resolved]
        : 'auto';
    }
  }

  // Content alignment (responsive)
  const hasContentAlign = DEVICES.some(
    d =>
      resolveResponsive(s.display?.contentAlign, d, x =>
        pick(x, ['start', 'center', 'end'] as const)
      ) !== undefined
  );

  if (hasContentAlign || hasMinHeight) {
    outerClasses.push('s-jc');

    for (const d of DEVICES) {
      const resolved =
        resolveResponsive(s.display?.contentAlign, d, x =>
          pick(x, ['start', 'center', 'end'] as const)
        ) ?? 'center';
      style[`--s-jc-${DEVICE_SUFFIX[d]}`] = JUSTIFY_MAP[resolved];
    }
  }

  // Hover states on section: s-hc, s-hf, s-hb, s-hs, s-hfl
  if (s.hover) {
    const hColor = safeColor(s.hover.textColor);
    if (hColor) {
      outerClasses.push('s-hc');
      style['--s-h-color'] = hColor;
    }

    if (s.hover.fill) {
      const f = fillValue(s.hover.fill);
      if (f) {
        outerClasses.push('s-hf');
        style['--s-h-fill'] = f.light;
      }
    }

    const hBd = safeColor(s.hover.borderColor);
    if (hBd) {
      outerClasses.push('s-hb');
      style['--s-h-bd'] = hBd;
    }

    if (s.hover.shadow) {
      const hSh = formatShadow(s.hover.shadow);
      if (hSh) {
        outerClasses.push('s-hs');
        style['--s-h-shadow'] = hSh;
      }
    }

    if (s.hover.filter) {
      const hFl = formatFilter(s.hover.filter);
      if (hFl) {
        outerClasses.push('s-hfl');
        style['--s-h-filter'] = hFl;
      }
    }
  }

  return {
    outerClasses: outerClasses.filter(Boolean),
    innerClasses,
    style: style as CSSProperties,
    hasFill: !!fill,
  };
}

export type ResolvedElementStyle = {
  classes: string[];
  style: CSSProperties;
};

/**
 * Resolves per-element styles (e.g. for a Hero's title, badge, button, or image).
 * Writes variables for all three devices (desktop, tablet, mobile) to avoid unintentional
 * CSS cascade inheritance from outer sections, and attaches hover classes (s-hc, s-hf, s-hb, s-hs).
 */
export function resolveElementStyle(
  es: ElementStyle | undefined
): ResolvedElementStyle {
  if (!es || typeof es !== 'object') {
    return { classes: [], style: {} };
  }

  const classes: string[] = [];
  const style: Record<string, string> = {};

  // Text color
  const color = safeColor(es.color);
  if (color) {
    style.color = color;
  }

  // Background / Fill (Fill object or hex/rgba color string)
  if (es.fill) {
    if (typeof es.fill === 'string') {
      const c = safeColor(es.fill);
      if (c) {
        classes.push('s-fill');
        style['--s-fill'] = c;
        style['--s-fill-dark'] = c;
      }
    } else {
      const f = fillValue(es.fill);
      if (f) {
        classes.push('s-fill');
        style['--s-fill'] = f.light;
        style['--s-fill-dark'] = f.dark;
      }
    }
  }

  // Typography
  const ty = es.typography;
  if (ty) {
    const unitSize = responsiveLength(
      ty.fontSize,
      ty.fontSizeUnit,
      PROP_UNITS.fontSize,
      false,
      'fs',
      style
    );
    if (unitSize) {
      classes.push('s-fs');
      // Ensure all 3 devices have explicit fallback values so section variables don't bleed in
      for (const d of DEVICES) {
        const key = `--s-fs-${DEVICE_SUFFIX[d]}`;
        if (!style[key]) {
          const resolved = resolveResponsive(ty.fontSize, d, v =>
            typeof v === 'number' && Number.isFinite(v) ? v : undefined
          );
          if (resolved !== undefined) {
            const u = pick(ty.fontSizeUnit, PROP_UNITS.fontSize) ?? 'px';
            style[key] = `${resolved}${u}`;
          }
        }
      }
    } else {
      const hasSize = DEVICES.some(
        d =>
          resolveResponsive(ty.size, d, x =>
            pick(x, ['sm', 'md', 'lg', 'xl'] as const)
          ) !== undefined
      );
      if (hasSize) {
        classes.push('s-fs');
        for (const d of DEVICES) {
          const resolved = resolveResponsive(ty.size, d, x =>
            pick(x, ['sm', 'md', 'lg', 'xl'] as const)
          );
          if (resolved) {
            style[`--s-fs-${DEVICE_SUFFIX[d]}`] = FONT_SIZE_REM[resolved];
          }
        }
      }
    }

    if (
      responsiveLength(
        ty.lineHeight,
        ty.lineHeightUnit,
        PROP_UNITS.lineHeight,
        false,
        'lh',
        style
      )
    ) {
      classes.push('s-lh');
      for (const d of DEVICES) {
        const key = `--s-lh-${DEVICE_SUFFIX[d]}`;
        if (!style[key]) {
          const resolved = resolveResponsive(ty.lineHeight, d, v =>
            typeof v === 'number' && Number.isFinite(v) ? v : undefined
          );
          if (resolved !== undefined) {
            const u = pick(ty.lineHeightUnit, PROP_UNITS.lineHeight) ?? 'em';
            style[key] = `${resolved}${u}`;
          }
        }
      }
    }

    if (
      responsiveLength(
        ty.letterSpacing,
        ty.letterSpacingUnit,
        PROP_UNITS.letterSpacing,
        true,
        'ls',
        style
      )
    ) {
      classes.push('s-ls');
      for (const d of DEVICES) {
        const key = `--s-ls-${DEVICE_SUFFIX[d]}`;
        if (!style[key]) {
          const resolved = resolveResponsive(ty.letterSpacing, d, v =>
            typeof v === 'number' && Number.isFinite(v) ? v : undefined
          );
          if (resolved !== undefined) {
            const u = pick(ty.letterSpacingUnit, PROP_UNITS.letterSpacing) ?? 'px';
            style[key] = `${resolved}${u}`;
          }
        }
      }
    }

    if (
      responsiveLength(
        ty.wordSpacing,
        ty.wordSpacingUnit,
        PROP_UNITS.wordSpacing,
        true,
        'ws',
        style
      )
    ) {
      classes.push('s-ws');
      for (const d of DEVICES) {
        const key = `--s-ws-${DEVICE_SUFFIX[d]}`;
        if (!style[key]) {
          const resolved = resolveResponsive(ty.wordSpacing, d, v =>
            typeof v === 'number' && Number.isFinite(v) ? v : undefined
          );
          if (resolved !== undefined) {
            const u = pick(ty.wordSpacingUnit, PROP_UNITS.wordSpacing) ?? 'px';
            style[key] = `${resolved}${u}`;
          }
        }
      }
    }

    const family = ty.family;
    if (family) {
      classes.push('s-ff');
      style['--s-ff'] = getFontStack(family);
    }

    const transform = pick(ty.transform, TEXT_TRANSFORMS);
    if (transform && transform !== 'none') classes.push(`s-tt-${transform}`);
    const fontStyle = pick(ty.fontStyle, FONT_STYLES);
    if (fontStyle && fontStyle !== 'normal') classes.push(`s-fst-${fontStyle}`);
    const decoration = pick(ty.decoration, TEXT_DECORATIONS);
    if (decoration && decoration !== 'none') classes.push(`s-td-${decoration}`);

    const hasWeight =
      (typeof ty.fontWeight === 'number' && ty.fontWeight >= 100 && ty.fontWeight <= 900) ||
      DEVICES.some(
        d => resolveResponsive(ty.weight, d, resolveFontWeight) !== undefined
      );
    if (hasWeight) {
      classes.push('s-fw');
      for (const d of DEVICES) {
        const resolved =
          resolveResponsive(ty.weight, d, resolveFontWeight) ??
          (ty.fontWeight ? String(ty.fontWeight) : undefined);
        if (resolved) {
          style[`--s-fw-${DEVICE_SUFFIX[d]}`] = String(resolved);
        }
      }
    }
  }

  // Text Stroke
  const textStroke = es.textStroke ?? ty?.textStroke;
  if (textStroke) {
    const color = safeColor(textStroke.color) ?? '#000000';
    const hasStrokeWidth =
      typeof textStroke.width === 'number' ||
      (typeof textStroke.width === 'object' && textStroke.width !== null);
    if (hasStrokeWidth || textStroke.color) {
      classes.push('s-tst');
      if (typeof textStroke.width === 'object' && textStroke.width !== null) {
        for (const d of DEVICES) {
          const w =
            resolveResponsive(textStroke.width, d, v =>
              typeof v === 'number' && Number.isFinite(v)
                ? clamp(v, 0, 50)
                : undefined
            ) ?? 0;
          style[`--s-tst-${DEVICE_SUFFIX[d]}`] = `${w}px ${color}`;
        }
        const desktopW =
          resolveResponsive(textStroke.width, 'desktop', v =>
            typeof v === 'number' && Number.isFinite(v)
              ? clamp(v, 0, 50)
              : undefined
          ) ?? 0;
        style['--s-tst'] = `${desktopW}px ${color}`;
      } else {
        const w =
          typeof textStroke.width === 'number'
            ? clamp(textStroke.width, 0, 50)
            : 1;
        style['--s-tst'] = `${w}px ${color}`;
        for (const d of DEVICES) {
          style[`--s-tst-${DEVICE_SUFFIX[d]}`] = `${w}px ${color}`;
        }
      }
    }
  }

  // Text Shadow (from typography.textShadow or es.textShadow)
  const textShadow = formatTextShadow(es.textShadow ?? ty?.textShadow);
  if (textShadow) {
    classes.push('s-tsh');
    style['--s-tsh'] = textShadow;
  }

  // Filter (cssFilter)
  const filterCss = formatFilter(es.filter);
  if (filterCss) {
    classes.push('s-filter');
    style['--s-filter'] = filterCss;
  }

  // Image size
  if (es.imageSize) {
    const resolvedSize = resolveImageSize(es.imageSize);
    if (resolvedSize.width !== undefined || resolvedSize.height !== undefined) {
      classes.push('s-img-size');
      if (resolvedSize.width !== undefined) {
        style['--s-img-w'] = `${resolvedSize.width}px`;
      }
      if (resolvedSize.height !== undefined) {
        style['--s-img-h'] = `${resolvedSize.height}px`;
      }
    }
  }

  // Border
  if (es.border) {
    const bs = pick(es.border.style, [
      'none',
      'solid',
      'dashed',
      'double',
      'dotted',
      'groove',
    ] as const);

    if (bs && bs !== 'none') {
      classes.push('s-bd');
      style['--s-bd-style'] = bs;
      const bc = safeColor(es.border.color);
      if (bc) style['--s-bd-color'] = bc;
      const bw = responsiveSides(es.border.width, 'b', 40, 'px');
      classes.push(...bw.classes);
      Object.assign(style, bw.vars);
    }

    if (
      responsiveLength(
        es.border.radius,
        es.border.radiusUnit,
        PROP_UNITS.radius,
        false,
        'br',
        style
      )
    ) {
      classes.push('s-br');
      for (const d of DEVICES) {
        const key = `--s-br-${DEVICE_SUFFIX[d]}`;
        if (!style[key]) {
          const resolved = resolveResponsive(es.border.radius, d, v =>
            typeof v === 'number' && Number.isFinite(v) ? v : undefined
          );
          if (resolved !== undefined) {
            const u = pick(es.border.radiusUnit, PROP_UNITS.radius) ?? 'px';
            style[key] = `${resolved}${u}`;
          }
        }
      }
    }
  }

  // Box Shadow
  if (es.shadow && typeof es.shadow === 'object') {
    const css = formatShadow(es.shadow);
    if (css) {
      classes.push('s-shadow');
      style['--s-shadow'] = css;
    }
  } else if (typeof es.shadow === 'string' && es.shadow !== 'none') {
    const cls = SHADOW[es.shadow as keyof typeof SHADOW];
    if (cls) classes.push(cls);
  }

  // Padding
  if (es.padding) {
    const pUnit = pick(es.paddingUnit, SPACING_UNITS) ?? 'px';
    const maxP = SPACING_LIMITS[pUnit].max;
    const pSides = responsiveSides(es.padding, 'p', maxP, pUnit);
    classes.push(...pSides.classes);
    Object.assign(style, pSides.vars);
  }

  // Margin
  if (es.margin) {
    const mUnit = pick(es.marginUnit, SPACING_UNITS) ?? 'px';
    const maxM = SPACING_LIMITS[mUnit].max;
    const mSides = responsiveSides(es.margin, 'm', maxM, mUnit);
    classes.push(...mSides.classes);
    Object.assign(style, mSides.vars);
  }

  // Hover states: s-hc (color), s-hf (fill), s-hb (border), s-hs (shadow)
  if (es.hover) {
    const hColor = safeColor(es.hover.color);
    if (hColor) {
      classes.push('s-hc');
      style['--s-h-color'] = hColor;
    }

    if (es.hover.fill) {
      if (typeof es.hover.fill === 'string') {
        const c = safeColor(es.hover.fill);
        if (c) {
          classes.push('s-hf');
          style['--s-h-fill'] = c;
        }
      } else {
        const f = fillValue(es.hover.fill);
        if (f) {
          classes.push('s-hf');
          style['--s-h-fill'] = f.light;
        }
      }
    }

    const hBd = safeColor(es.hover.borderColor);
    if (hBd) {
      classes.push('s-hb');
      style['--s-h-bd'] = hBd;
    }

    if (es.hover.shadow) {
      const hSh = formatShadow(es.hover.shadow);
      if (hSh) {
        classes.push('s-hs');
        style['--s-h-shadow'] = hSh;
      }
    }

    if (es.hover.filter) {
      const hFl = formatFilter(es.hover.filter);
      if (hFl) {
        classes.push('s-hfl');
        style['--s-h-filter'] = hFl;
      }
    }
  }

  return {
    classes: Array.from(new Set(classes.filter(Boolean))),
    style: style as CSSProperties,
  };
}

/* ---------- Chrome style (Header / Footer root settings) ---------- */

export type ChromeStyle = {
  background?: 'default' | 'muted' | 'primary' | 'dark';
  fill?: Fill;
  textColor?: string;
  linkColor?: string;
  linkHoverColor?: string;
  spacing?: Responsive<Sides>;
  spacingUnit?: SpacingUnit;
  border?: BorderSettings;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | ShadowSettings;
  minHeight?: Responsive<number>;
  minHeightUnit?: 'px' | 'rem' | 'vh' | LengthUnit;
  contentWidth?: 'full' | 'boxed';
  maxWidth?: Responsive<number>;
  maxWidthUnit?: 'px' | 'rem' | '%' | 'vw' | LengthUnit;
  scrolled?: {
    fill?: Fill;
    textColor?: string;
    linkColor?: string;
  };
  transparentTextColor?: string;
};

export type ResolvedChromeStyle = {
  classes: string[];
  style: CSSProperties;
};

export function resolveChromeStyle(
  style?: ChromeStyle,
  legacy?: { background?: string; paddingY?: string }
): ResolvedChromeStyle {
  if (!style && !legacy) {
    return { classes: [], style: {} };
  }

  const effective: ChromeStyle = style ? { ...style } : {};

  if (!effective.background && legacy?.background) {
    const bg = legacy.background === 'inverted' ? 'dark' : legacy.background;
    if (bg === 'default' || bg === 'muted' || bg === 'primary' || bg === 'dark') {
      effective.background = bg;
    }
  }

  if (!effective.spacing && legacy?.paddingY && legacy.paddingY !== 'none') {
    const map: Record<string, number> = {
      sm: 16,
      md: 32,
      lg: 64,
      xl: 96,
    };
    const val = map[legacy.paddingY];
    if (val !== undefined) {
      effective.spacing = {
        desktop: { top: val, bottom: val },
        tablet: { top: val, bottom: val },
        mobile: { top: val, bottom: val },
      };
      effective.spacingUnit = 'px';
    }
  }

  const sectionSettings: SectionSettings = {
    background: effective.background,
    fill: effective.fill,
    textColor: effective.textColor,
    spacing: effective.spacing,
    spacingUnit: effective.spacingUnit,
    border: effective.border,
    shadow: effective.shadow,
  };

  const base = resolveSectionStyle(sectionSettings);
  const classes: string[] = [...base.outerClasses];
  if (!base.hasFill && effective.background && effective.background !== 'default') {
    classes.push(`s-section-${effective.background}`);
  }
  const vars: Record<string, string> = { ...(base.style as Record<string, string>) };

  const linkColor = safeColor(effective.linkColor);
  if (linkColor) {
    classes.push('has-link-color');
    vars['--chrome-link'] = linkColor;
  }

  const linkHoverColor = safeColor(effective.linkHoverColor);
  if (linkHoverColor) {
    classes.push('has-link-hover-color');
    vars['--chrome-link-hover'] = linkHoverColor;
  }

  const scrolledFill = fillValue(effective.scrolled?.fill);
  const scrolledFg = safeColor(effective.scrolled?.textColor);
  const scrolledLink = safeColor(effective.scrolled?.linkColor);
  if (scrolledFill || scrolledFg || scrolledLink) {
    classes.push('has-scrolled-style');
    if (scrolledFill) {
      vars['--chrome-scrolled-fill'] = scrolledFill.light;
      vars['--chrome-scrolled-fill-dark'] = scrolledFill.dark;
    }
    if (scrolledFg) {
      vars['--chrome-scrolled-fg'] = scrolledFg;
    }
    if (scrolledLink) {
      vars['--chrome-scrolled-link'] = scrolledLink;
    }
  }

  const transparentFg = safeColor(effective.transparentTextColor);
  if (transparentFg) {
    classes.push('has-transparent-style');
    vars['--chrome-transparent-fg'] = transparentFg;
  }

  if (effective.minHeight && typeof effective.minHeight === 'object') {
    const mhUnit = pick(effective.minHeightUnit, ['px', 'rem', 'em', 'vh', 'vw'] as const) ?? 'px';
    let anyMh = false;
    for (const d of DEVICES) {
      const val = resolveResponsive(effective.minHeight, d, v => (typeof v === 'number' && Number.isFinite(v) ? v : undefined));
      if (val !== undefined && val >= 0) {
        const clamped = clamp(val, 0, mhUnit === 'px' ? 2000 : 100);
        if (clamped !== undefined) {
          vars[`--s-mh-${DEVICE_SUFFIX[d]}`] = `${clamped}${mhUnit}`;
          anyMh = true;
        }
      }
    }
    if (anyMh) {
      classes.push('s-mh');
    }
  }

  if (effective.contentWidth === 'boxed') {
    classes.push('is-boxed');
    if (effective.maxWidth && typeof effective.maxWidth === 'object') {
      const mwUnit = pick(effective.maxWidthUnit, ['px', 'rem', '%', 'vw'] as const) ?? 'px';
      for (const d of DEVICES) {
        const val = resolveResponsive(effective.maxWidth, d, v => (typeof v === 'number' && Number.isFinite(v) ? v : undefined));
        if (val !== undefined && val > 0) {
          const clamped = clamp(val, 100, mwUnit === 'px' ? 3000 : 100);
          if (clamped !== undefined) {
            vars[`--chrome-max-width-${DEVICE_SUFFIX[d]}`] = `${clamped}${mwUnit}`;
          }
        }
      }
    }
  }

  return {
    classes: Array.from(new Set(classes.filter(Boolean))),
    style: vars as CSSProperties,
  };
}

/* ---------- Container / flex / grid layout validation and resolution ----------

Layout intent is stored as validated, unit-aware numbers and allow-listed
keywords. Nothing here accepts arbitrary CSS strings.
*/

export const BOXED_WIDTH_LIMITS = { min: 1, max: 2000, step: 1 };
export const FLEX_NUMBER_LIMITS = { min: 0, max: 100, step: 1 };
const ORDER_LIMITS = { min: -1000, max: 1000, step: 1 };
const GRID_LINE_LIMITS = { min: 1, max: 100, step: 1 };
const TRACK_LIMIT = 10000;
const TRACK_MAX_REPEAT = 1000;

const TRACK_SIZE = /^([0-9]+(?:\.[0-9]+)?)(px|rem|em|%|vw|fr)?$/;
const TRACK_FUNCTION = /^([a-z-]+)\(([\s\S]*)\)$/i;

function splitTrackList(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (const ch of value) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;

    if (depth === 0 && (ch === ',' || ch === ' ' || ch === '\t')) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Validates one CSS track size: keywords, measures, fit-content(), repeat(), minmax(). */
function safeTrackSize(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  if (!t) return undefined;
  if (t === 'auto' || t === 'min-content' || t === 'max-content') return t;

  const fn = TRACK_FUNCTION.exec(t);

  if (fn) {
    const [, name, inner] = fn;
    const innerTrim = inner.trim();

    if (name === 'fit-content') {
      const innerSafe = safeTrackSize(innerTrim);
      return innerSafe !== undefined ? `fit-content(${innerSafe})` : undefined;
    }

    if (name === 'repeat') {
      const mm = /^\s*(auto-fit|auto-fill|(\d+))\s*,\s*([\s\S]+)\s*$/.exec(
        innerTrim
      );
      if (!mm) return undefined;
      const tracks = splitTrackList(mm[3]);
      if (
        tracks.length === 0 ||
        tracks.some(t => safeTrackSize(t) === undefined)
      )
        return undefined;

      if (mm[2]) {
        const count = Math.min(TRACK_MAX_REPEAT, Math.max(1, Number(mm[2])));
        return `repeat(${count}, ${tracks.join(', ')})`;
      }

      return `repeat(${mm[1]}, ${tracks.join(', ')})`;
    }

    if (name === 'minmax') {
      const tracks = splitTrackList(innerTrim);
      if (tracks.length !== 2) return undefined;
      if (
        safeTrackSize(tracks[0]) === undefined ||
        safeTrackSize(tracks[1]) === undefined
      )
        return undefined;
      return `minmax(${tracks.join(', ')})`;
    }

    return undefined;
  }

  const m = TRACK_SIZE.exec(t);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > TRACK_LIMIT) return undefined;
  return `${n}${m[2] ?? 'fr'}`;
}

/** Validates a full track list such as `1fr 1fr` or `repeat(auto-fit, minmax(200px, 1fr))`. */
export function safeTrackList(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const tracks = splitTrackList(value);
  if (tracks.length === 0) return undefined;
  const safe = tracks.map(safeTrackSize);
  if (safe.some(t => t === undefined)) return undefined;
  return safe.join(' ');
}

function clampNumber(n: unknown, min: number, max: number): number | undefined {
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

const validFinite = (x: unknown): number | undefined =>
  typeof x === 'number' && Number.isFinite(x) ? x : undefined;

export function normalizeResponsiveNumber(
  value: unknown,
  limits: Limits
): Responsive<number> | undefined {
  if (value === undefined || value === null) return undefined;

  if (typeof value === 'object' && !Array.isArray(value)) {
    const out: Partial<Record<Device, number>> = {};
    let any = false;

    for (const d of DEVICES) {
      const n = clampNumber(
        (value as Record<string, unknown>)[d],
        limits.min,
        limits.max
      );

      if (n !== undefined) {
        out[d] = n;
        any = true;
      }
    }

    return any ? out : undefined;
  }

  const n = clampNumber(value, limits.min, limits.max);
  return n !== undefined ? { desktop: n } : undefined;
}

export function normalizeResponsiveEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): Responsive<T> | undefined {
  if (value === undefined || value === null) return undefined;
  const pickOne = (x: unknown): T | undefined => pick(x, allowed);

  if (typeof value === 'object' && !Array.isArray(value)) {
    const out: Partial<Record<Device, T>> = {};
    let any = false;

    for (const d of DEVICES) {
      const resolved = pickOne((value as Record<string, unknown>)[d]);

      if (resolved !== undefined) {
        out[d] = resolved;
        any = true;
      }
    }

    return any ? out : undefined;
  }

  const resolved = pickOne(value);
  return resolved !== undefined ? { desktop: resolved } : undefined;
}

function normalizeResponsiveTrack(
  value: unknown
): Responsive<string> | undefined {
  if (value === undefined || value === null) return undefined;

  if (typeof value === 'object' && !Array.isArray(value)) {
    const out: Partial<Record<Device, string>> = {};
    let any = false;

    for (const d of DEVICES) {
      const safe = safeTrackList((value as Record<string, unknown>)[d]);

      if (safe !== undefined) {
        out[d] = safe;
        any = true;
      }
    }

    return any ? out : undefined;
  }

  const safe = safeTrackList(value);
  return safe !== undefined ? { desktop: safe } : undefined;
}

export function normalizeContainerSettings(value: unknown): ContainerSettings {
  const c =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const unit = pick(c.sizeUnit, LENGTH_UNITS) ?? 'px';
  const gapUnit = pick(c.gapUnit, LENGTH_UNITS) ?? 'px';
  const basisUnit = pick(c.basisUnit, LENGTH_UNITS) ?? 'px';
  const lim = LENGTH_LIMITS[unit];
  const basisLim = LENGTH_LIMITS[basisUnit];

  let link: UrlValue | undefined;

  if (typeof c.link === 'string') {
    const url = safeUrl(c.link);
    if (url) link = { url };
  } else if (c.link && typeof c.link === 'object') {
    const o = c.link as { url?: unknown; newTab?: unknown; nofollow?: unknown };
    const url = safeUrl(o.url);
    if (url) link = { url, newTab: !!o.newTab, nofollow: !!o.nofollow };
  }

  const raw = {
    ...DEFAULT_CONTAINER,
    tag: pick(c.tag, CONTAINER_TAGS) ?? DEFAULT_CONTAINER.tag,
    mode: pick(c.mode, LAYOUT_MODES) ?? DEFAULT_CONTAINER.mode,
    direction:
      normalizeResponsiveEnum(c.direction, FLEX_DIRECTIONS) ??
      DEFAULT_CONTAINER.direction,
    wrap: normalizeResponsiveEnum(c.wrap, FLEX_WRAPS) ?? DEFAULT_CONTAINER.wrap,
    justify:
      normalizeResponsiveEnum(c.justify, JUSTIFY_CONTENTS) ??
      DEFAULT_CONTAINER.justify,
    alignItems:
      normalizeResponsiveEnum(c.alignItems, ALIGN_ITEMS_VALUES) ??
      DEFAULT_CONTAINER.alignItems,
    alignContent:
      normalizeResponsiveEnum(c.alignContent, ALIGN_CONTENTS) ??
      DEFAULT_CONTAINER.alignContent,
    gap: normalizeResponsiveNumber(c.gap, LENGTH_LIMITS[gapUnit]),
    gapUnit,
    columnGap: normalizeResponsiveNumber(c.columnGap, LENGTH_LIMITS[gapUnit]),
    rowGap: normalizeResponsiveNumber(c.rowGap, LENGTH_LIMITS[gapUnit]),
    width: normalizeResponsiveNumber(c.width, lim),
    minWidth: normalizeResponsiveNumber(c.minWidth, lim),
    maxWidth: normalizeResponsiveNumber(c.maxWidth, lim),
    height: normalizeResponsiveNumber(c.height, lim),
    minHeight: normalizeResponsiveNumber(c.minHeight, lim),
    maxHeight: normalizeResponsiveNumber(c.maxHeight, lim),
    sizeUnit: unit,
    grow: normalizeResponsiveNumber(c.grow, FLEX_NUMBER_LIMITS),
    shrink: normalizeResponsiveNumber(c.shrink, FLEX_NUMBER_LIMITS),
    basis: normalizeResponsiveNumber(c.basis, basisLim),
    basisUnit,
    boxSizing:
      typeof c.boxSizing === 'object' && c.boxSizing !== null
        ? (normalizeResponsiveEnum(c.boxSizing, ['border-box', 'content-box']) ?? 'border-box')
        : (pick(c.boxSizing, ['border-box', 'content-box']) ?? 'border-box'),
    gridTemplateColumns: normalizeResponsiveTrack(c.gridTemplateColumns),
    gridTemplateRows: normalizeResponsiveTrack(c.gridTemplateRows),
    gridAutoFlow: normalizeResponsiveEnum(c.gridAutoFlow, GRID_AUTO_FLOWS),
    contentWidth: pick(c.contentWidth, CONTENT_WIDTHS),
    boxedWidth: normalizeResponsiveNumber(c.boxedWidth, BOXED_WIDTH_LIMITS),
    link,
  } as Record<string, unknown>;

  const out: Record<string, unknown> = {};

  for (const key of Object.keys(raw)) {
    if (raw[key] !== undefined) out[key] = raw[key];
  }

  return out as ContainerSettings;
}

const ALIGN_SELF_CSS: Record<AlignSelf, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

export function resolveFlexItemStyle(
  f: FlexChildSettings | undefined,
  device: Device
): CSSProperties {
  const style: CSSProperties = {};
  if (!f) return style;
  const grow = clampNumber(
    resolveResponsive(f.grow, device, validFinite),
    FLEX_NUMBER_LIMITS.min,
    FLEX_NUMBER_LIMITS.max
  );
  if (grow !== undefined) style.flexGrow = grow;
  const shrink = clampNumber(
    resolveResponsive(f.shrink, device, validFinite),
    FLEX_NUMBER_LIMITS.min,
    FLEX_NUMBER_LIMITS.max
  );
  if (shrink !== undefined) style.flexShrink = shrink;
  const basis = resolveResponsive(f.basis, device, validFinite);

  if (basis !== undefined) {
    style.flexBasis = `${clampNumber(basis, LENGTH_LIMITS[f.basisUnit ?? 'px'].min, LENGTH_LIMITS[f.basisUnit ?? 'px'].max) ?? 0}${pick(f.basisUnit, LENGTH_UNITS) ?? 'px'}`;
  }

  const alignSelf = resolveResponsive(f.alignSelf, device, x =>
    pick(x, ALIGN_SELF_VALUES)
  );
  if (alignSelf) style.alignSelf = ALIGN_SELF_CSS[alignSelf];
  const order = clampNumber(
    resolveResponsive(f.order, device, validFinite),
    ORDER_LIMITS.min,
    ORDER_LIMITS.max
  );
  if (order !== undefined) style.order = order;
  return style;
}

export function resolveGridItemStyle(
  g: GridChildSettings | undefined,
  device: Device
): CSSProperties {
  const style: CSSProperties = {};
  if (!g) return style;
  const columnStart = clampNumber(
    resolveResponsive(g.columnStart, device, validFinite),
    GRID_LINE_LIMITS.min,
    GRID_LINE_LIMITS.max
  );
  if (columnStart !== undefined) style.gridColumnStart = columnStart;
  const columnSpan = clampNumber(
    resolveResponsive(g.columnSpan, device, validFinite),
    GRID_LINE_LIMITS.min,
    GRID_LINE_LIMITS.max
  );
  if (columnSpan !== undefined) style.gridColumnEnd = `span ${columnSpan}`;
  const rowStart = clampNumber(
    resolveResponsive(g.rowStart, device, validFinite),
    GRID_LINE_LIMITS.min,
    GRID_LINE_LIMITS.max
  );
  if (rowStart !== undefined) style.gridRowStart = rowStart;
  const rowSpan = clampNumber(
    resolveResponsive(g.rowSpan, device, validFinite),
    GRID_LINE_LIMITS.min,
    GRID_LINE_LIMITS.max
  );
  if (rowSpan !== undefined) style.gridRowEnd = `span ${rowSpan}`;
  return style;
}

export function resolveContainerStyle(
  c: ContainerSettings | undefined,
  device: Device
): ResolvedContainerStyle {
  const s = { ...DEFAULT_CONTAINER, ...c };
  const classes: string[] = [];
  const style: Record<string, string> = {};

  const unit = pick(s.sizeUnit, LENGTH_UNITS) ?? 'px';
  const gapUnit = pick(s.gapUnit, LENGTH_UNITS) ?? 'px';
  const basisUnit = pick(s.basisUnit, LENGTH_UNITS) ?? 'px';
  const lim = LENGTH_LIMITS[unit];
  const gapLim = LENGTH_LIMITS[gapUnit];
  const basisLim = LENGTH_LIMITS[basisUnit];

  const mode = pick(s.mode, LAYOUT_MODES) ?? 'flex';
  const resolvedMode = (d: Device) =>
    resolveResponsive(s.mode, d, v => pick(v, LAYOUT_MODES)) ?? mode;

  classes.push('s-c-d');
  for (const d of DEVICES)
    style[`--s-c-d-${DEVICE_SUFFIX[d]}`] = resolvedMode(d);

  const emitGap = (
    prop: 'gap' | 'columnGap' | 'rowGap',
    cls: string,
    varName: string
  ) => {
    const has = DEVICES.some(
      d => resolveResponsive(s[prop], d, validFinite) !== undefined
    );
    if (!has) return;
    classes.push(cls);

    for (const d of DEVICES) {
      const n = resolveResponsive(s[prop], d, validFinite);
      const v = n !== undefined ? clampNumber(n, gapLim.min, gapLim.max) : 0;
      style[`${varName}-${DEVICE_SUFFIX[d]}`] = `${v ?? 0}${gapUnit}`;
    }
  };

  if (mode === 'flex') {
    const resolvedFlex = (
      d: Device,
      key: 'direction' | 'wrap' | 'justify' | 'alignItems' | 'alignContent'
    ) => {
      const allowed =
        key === 'direction'
          ? FLEX_DIRECTIONS
          : key === 'wrap'
            ? FLEX_WRAPS
            : key === 'justify'
              ? JUSTIFY_CONTENTS
              : key === 'alignItems'
                ? ALIGN_ITEMS_VALUES
                : ALIGN_CONTENTS;
      const defaults: Record<string, string> = {
        direction: 'row',
        wrap: 'nowrap',
        justify: 'start',
        alignItems: 'stretch',
        alignContent: 'start',
      };
      return (
        resolveResponsive(s[key], d, v => pick(v, allowed)) ?? defaults[key]
      );
    };

    for (const [key, cls] of [
      ['direction', 's-c-fd'],
      ['wrap', 's-c-fw'],
      ['justify', 's-c-jc'],
      ['alignItems', 's-c-ai'],
      ['alignContent', 's-c-ac'],
    ] as const) {
      classes.push(cls);

      for (const d of DEVICES) {
        style[`--s-c-${cls.slice(4)}-${DEVICE_SUFFIX[d]}`] = resolvedFlex(
          d,
          key
        );
      }
    }
  } else {
    for (const [prop, cls, varName] of [
      ['gridTemplateColumns', 's-c-gtc', '--s-c-gtc'],
      ['gridTemplateRows', 's-c-gtr', '--s-c-gtr'],
    ] as const) {
      const has = DEVICES.some(
        d =>
          safeTrackList(
            resolveResponsive(s[prop], d, x =>
              typeof x === 'string' ? x : undefined
            )
          ) !== undefined
      );
      if (!has) continue;
      classes.push(cls);

      for (const d of DEVICES) {
        const resolved = safeTrackList(
          resolveResponsive(s[prop], d, x =>
            typeof x === 'string' ? x : undefined
          )
        );
        if (resolved !== undefined)
          style[`${varName}-${DEVICE_SUFFIX[d]}`] = resolved;
      }
    }

    const flow = (d: Device) =>
      resolveResponsive(s.gridAutoFlow, d, v => pick(v, GRID_AUTO_FLOWS)) ??
      'row';
    classes.push('s-c-gaf');
    for (const d of DEVICES) style[`--s-c-gaf-${DEVICE_SUFFIX[d]}`] = flow(d);
  }

  emitGap('gap', 's-c-ga', '--s-c-ga');
  emitGap('columnGap', 's-c-cga', '--s-c-cga');
  emitGap('rowGap', 's-c-rga', '--s-c-rga');

  for (const [prop, cls, varName] of [
    ['width', 's-c-w', '--s-c-w'],
    ['minWidth', 's-c-nw', '--s-c-nw'],
    ['maxWidth', 's-c-xw', '--s-c-xw'],
    ['height', 's-c-h', '--s-c-h'],
    ['minHeight', 's-c-nh', '--s-c-nh'],
    ['maxHeight', 's-c-xh', '--s-c-xh'],
  ] as const) {
    const has = DEVICES.some(
      d => resolveResponsive(s[prop], d, validFinite) !== undefined
    );
    if (!has) continue;
    classes.push(cls);

    for (const d of DEVICES) {
      const n = resolveResponsive(s[prop], d, validFinite);

      if (n !== undefined) {
        style[`${varName}-${DEVICE_SUFFIX[d]}`] =
          `${clampNumber(n, lim.min, lim.max) ?? 0}${unit}`;
      }
    }
  }

  const hasGrow = DEVICES.some(
    d => resolveResponsive(s.grow, d, validFinite) !== undefined
  );
  if (hasGrow) {
    classes.push('s-c-grw');
    for (const d of DEVICES) {
      const n = resolveResponsive(s.grow, d, validFinite);
      if (n !== undefined) {
        style[`--s-c-grw-${DEVICE_SUFFIX[d]}`] = `${clampNumber(n, FLEX_NUMBER_LIMITS.min, FLEX_NUMBER_LIMITS.max) ?? 0}`;
      }
    }
  }

  const hasShrink = DEVICES.some(
    d => resolveResponsive(s.shrink, d, validFinite) !== undefined
  );
  if (hasShrink) {
    classes.push('s-c-grs');
    for (const d of DEVICES) {
      const n = resolveResponsive(s.shrink, d, validFinite);
      if (n !== undefined) {
        style[`--s-c-grs-${DEVICE_SUFFIX[d]}`] = `${clampNumber(n, FLEX_NUMBER_LIMITS.min, FLEX_NUMBER_LIMITS.max) ?? 0}`;
      }
    }
  }

  const hasBasis = DEVICES.some(
    d => resolveResponsive(s.basis, d, validFinite) !== undefined
  );
  if (hasBasis) {
    classes.push('s-c-grb');
    for (const d of DEVICES) {
      const n = resolveResponsive(s.basis, d, validFinite);
      if (n !== undefined) {
        style[`--s-c-grb-${DEVICE_SUFFIX[d]}`] = `${clampNumber(n, basisLim.min, basisLim.max) ?? 0}${basisUnit}`;
      }
    }
  }

  classes.push('s-c-box');
  for (const d of DEVICES) {
    const bs =
      resolveResponsive(s.boxSizing, d, v =>
        pick(v, ['border-box', 'content-box'])
      ) ?? 'border-box';
    style[`--s-c-box-${DEVICE_SUFFIX[d]}`] = bs;
  }

  if (s.contentWidth === 'boxed') {
    classes.push('s-c-boxed');

    for (const d of DEVICES) {
      const n = resolveResponsive(s.boxedWidth, d, validFinite);
      style[`--s-c-bw-${DEVICE_SUFFIX[d]}`] =
        `${clampNumber(n ?? 1152, BOXED_WIDTH_LIMITS.min, BOXED_WIDTH_LIMITS.max) ?? 1152}px`;
    }
  }

  return {
    classes: classes.filter(Boolean),
    style: style as CSSProperties,
  };
}

export type ResolvedAnimation = {
  entranceClass?: string;
  exitClass?: string;
  hoverClass?: string;
  duration?: number;
  delay?: number;
  easing?: string;
  stagger?: number;
  trigger?: Trigger;
  devices?: Partial<Record<Device, boolean>>;
};

export function resolveAnimation(
  a: AnimationSettings | undefined
): ResolvedAnimation | null {
  if (!a) return null;
  const entrance = a.entrance && a.entrance !== 'none' ? a.entrance : undefined;
  const exit = a.exit && a.exit !== 'none' ? a.exit : undefined;
  const hover = a.hover && a.hover !== 'none' ? a.hover : undefined;
  if (!entrance && !exit && !hover) return null;
  return {
    entranceClass: entrance,
    exitClass: exit,
    hoverClass: hover,
    duration: clamp(a.duration, 0, 5000),
    delay: clamp(a.delay, 0, 5000),
    easing: a.easing,
    stagger:
      typeof a.stagger === 'number' ? clamp(a.stagger, 0, 1000) : undefined,
    trigger: a.trigger,
    devices: a.devices,
  };
}
