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
  grayscale?: number;
  hueRotate?: number;
};

export type TextShadowSettings = { x?: number; y?: number; blur?: number; color?: string };
export type TextStrokeSettings = { width?: number; color?: string };

export type HoverSettings = {
  fill?: Fill;
  textColor?: string;
  borderColor?: string;
  opacity?: number;
  scale?: number;
  shadow?: ShadowSettings;
};

export const FONT_FAMILIES = ['Inter', 'Plus Jakarta Sans', 'JetBrains Mono', 'System'] as const;
export const TEXT_TRANSFORMS = ['none', 'uppercase', 'lowercase', 'capitalize'] as const;
export const FONT_STYLES = ['normal', 'italic', 'oblique'] as const;
export const TEXT_DECORATIONS = ['none', 'underline', 'overline', 'line-through'] as const;

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
  aliasEntrance,
  aliasExit,
  aliasHover,
} from './animation-catalog';
import { ENTRANCES, EXITS, HOVERS } from './animation-catalog';

export const TRIGGERS = ['load', 'scroll', 'hover', 'click'] as const;
export const EASINGS = ['ease-out', 'spring'] as const;
export const PAGE_TRANSITIONS = ['none', 'fade', 'slide-up'] as const;

export type Entrance = (typeof ENTRANCES)[number];
export type Exit = (typeof EXITS)[number];
export type Trigger = (typeof TRIGGERS)[number];
export type HoverEffect = (typeof HOVERS)[number];
export type Easing = (typeof EASINGS)[number];

export type AnimationSettings = {
  entrance?: Entrance | 'none' | '';
  exit?: Exit | 'none' | '';
  trigger?: Trigger;
  duration?: number;
  delay?: number;
  easing?: Easing;
  stagger?: number;
  hover?: HoverEffect | 'none' | '';
  devices?: Partial<Record<Device, boolean>>;
};

export type SpacingSettings = {
  padding?: Responsive<Sides>;
  margin?: Responsive<Sides>;
  unit?: SpacingUnit;
};

export type SectionSettings = {
  spacing?: SpacingSettings;
  paddingY?: 'none' | 'sm' | 'md' | 'lg';
  background?: 'default' | 'muted' | 'primary' | 'dark';
  fill?: Fill;
  border?: BorderSettings;
  shadow?: ShadowSettings | 'none' | 'sm' | 'md' | 'lg';
  filter?: FilterSettings;
  typography?: Typography;
  textColor?: string;
  align?: MaybeResponsive<'left' | 'center' | 'right'>;
  display?: DisplaySettings;
  animation?: AnimationSettings;
  width?: Responsive<number>;
  widthUnit?: LengthUnit;
  maxWidth?: Responsive<number>;
  maxWidthUnit?: LengthUnit;
};

export type UrlValue = { url?: string; newTab?: boolean; nofollow?: boolean };

export function normalizeUrlValue(value: unknown): UrlValue {
  if (typeof value === 'string') return { url: value };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    return {
      url: typeof o.url === 'string' ? o.url : undefined,
      newTab: !!o.newTab,
      nofollow: !!o.nofollow,
    };
  }
  return {};
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

const DEVICE_ORDER: Record<Device, Device[]> = {
  desktop: ['desktop', 'tablet', 'mobile'],
  tablet: ['tablet', 'desktop', 'mobile'],
  mobile: ['mobile', 'tablet', 'desktop'],
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

  if (!s.spacing && s.paddingY && s.paddingY !== 'none') {
    const py = PADDING_Y[s.paddingY];
    if (py) outerClasses.push(py);
  }

  if (s.background && s.background !== 'default') {
    const bg = BACKGROUND[s.background];
    if (bg) outerClasses.push(bg);
  }

  if (s.fill) {
    const f = s.fill;
    if (f.type === 'color' && f.color) {
      const c = safeColor(f.color);
      if (c) {
        style['--s-bg'] = c;
        outerClasses.push('s-fill');
        hasFill = true;
      }
    } else if (f.type === 'gradient' && f.from && f.to) {
      const from = safeColor(f.from);
      const to = safeColor(f.to);
      if (from && to) {
        const angle = clamp(f.angle, 0, 360) ?? 180;
        style['--s-bg'] = `linear-gradient(${angle}deg, ${from}, ${to})`;
        outerClasses.push('s-fill');
        hasFill = true;
      }
    } else if (f.type === 'image' && f.image) {
      const url = safeUrl(f.image);
      if (url) {
        style['--s-bg-image'] = `url(${url})`;
        outerClasses.push('s-fill-image');
        hasFill = true;
      }
    }
  }

  if (s.textColor) {
    const c = safeColor(s.textColor);
    if (c) {
      style['--s-color'] = c;
      outerClasses.push('s-color');
    }
  }

  if (s.align) {
    const a = resolveResponsive(s.align, 'desktop', x => pick(x, ['left', 'center', 'right'] as const));
    if (a) outerClasses.push(`text-${a}`);
  }

  return { outerClasses, innerClasses, style: style as CSSProperties, hasFill };
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

export function resolveAnimation(a: AnimationSettings | undefined): ResolvedAnimation | null {
  if (!a) return null;
  const entrance = a.entrance && a.entrance !== 'none' && a.entrance !== '' ? a.entrance : undefined;
  const exit = a.exit && a.exit !== 'none' && a.exit !== '' ? a.exit : undefined;
  const hover = a.hover && a.hover !== 'none' && a.hover !== '' ? a.hover : undefined;
  if (!entrance && !exit && !hover) return null;

  return {
    entranceClass: entrance,
    exitClass: exit,
    hoverClass: hover,
    duration: clamp(a.duration, 0, 5000),
    delay: clamp(a.delay, 0, 5000),
    easing: a.easing,
    stagger: clamp(a.stagger, 0, 1000),
    trigger: a.trigger,
    devices: a.devices,
  };
}
