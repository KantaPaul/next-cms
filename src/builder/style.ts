import type { CSSProperties } from 'react';

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

export type LengthUnit = 'px' | 'rem' | 'em' | '%' | 'vw';
export const LENGTH_UNITS: readonly LengthUnit[] = [
  'px',
  'rem',
  'em',
  '%',
  'vw',
] as const;
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
export type TextStrokeSettings = { width?: number; color?: string };
export type HoverSettings = {
  fill?: Fill;
  textColor?: string;
  borderColor?: string;
  opacity?: number;
  scale?: number;
  shadow?: ShadowSettings;
};

export const FONT_FAMILIES = [
  'Inter',
  'Plus Jakarta Sans',
  'JetBrains Mono',
  'System',
] as const;
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
  weight?: MaybeResponsive<'' | 'regular' | 'medium' | 'bold'>;
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
  boxSizing?: 'border-box' | 'content-box';
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
  const hue = clamp(f.hueRotate ?? f.hue, 0, 360);
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
  const size =
    pick(fill.size, ['cover', 'contain', 'auto'] as const) ?? 'cover';
  const posX = clamp(fill.posX, 0, 100);
  const posY = clamp(fill.posY, 0, 100);
  const position =
    posX !== undefined || posY !== undefined
      ? `${posX ?? 50}% ${posY ?? 50}%`
      : (pick(fill.position, [
          'center',
          'top',
          'bottom',
          'left',
          'right',
        ] as const) ?? 'center');
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
const FONT_STACK: Record<(typeof FONT_FAMILIES)[number], string> = {
  Inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  'Plus Jakarta Sans':
    "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  'JetBrains Mono': "'JetBrains Mono', ui-monospace, monospace",
  System: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
};
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

  const family = pick(ty?.family, FONT_FAMILIES);

  if (family) {
    outerClasses.push('s-ff');
    style['--s-ff'] = FONT_STACK[family];
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

  const hasWeight = DEVICES.some(
    d =>
      resolveResponsive(s.typography?.weight, d, x =>
        pick(x, ['regular', 'medium', 'bold'] as const)
      ) !== undefined
  );

  if (hasWeight) {
    outerClasses.push('s-fw');

    for (const d of DEVICES) {
      const resolved = resolveResponsive(s.typography?.weight, d, x =>
        pick(x, ['regular', 'medium', 'bold'] as const)
      );
      if (resolved)
        style[`--s-fw-${DEVICE_SUFFIX[d]}`] = FONT_WEIGHT_MAP[resolved];
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

  return {
    outerClasses: outerClasses.filter(Boolean),
    innerClasses,
    style: style as CSSProperties,
    hasFill: !!fill,
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
    boxSizing: pick(c.boxSizing, ['border-box', 'content-box']) ?? 'border-box',
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

  classes.push('s-c-box');
  for (const d of DEVICES)
    style[`--s-c-box-${DEVICE_SUFFIX[d]}`] =
      pick(s.boxSizing, ['border-box', 'content-box']) ?? 'border-box';

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
