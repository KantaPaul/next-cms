import type { CSSProperties } from 'react';
import {
  DEVICES,
  type Device,
  LENGTH_LIMITS,
  type LengthUnit,
  PROP_UNITS,
  type Responsive,
  resolveResponsive,
  safeColor,
  SIDES,
  type Sides,
  SPACING_LIMITS,
  SPACING_UNITS,
  type SpacingUnit,
} from '@/builder/style';
import {
  DEFAULT_DRAWER_SETTINGS,
  DEFAULT_POPUP_SETTINGS,
  type OverlayBackdrop,
  type OverlayLayout,
  type OverlayLength,
  type OverlayPadding,
} from './types';

export type OverlayCategory = 'Popup' | 'Drawer';

type Limits = { min: number; max: number; step: number };

export const OVERLAY_WIDTH_UNITS = ['px', '%', 'vw', 'rem'] as const;
export const OVERLAY_WIDTH_LIMITS: Record<
  (typeof OVERLAY_WIDTH_UNITS)[number],
  Limits
> = {
  px: { min: 100, max: 1920, step: 1 },
  '%': { min: 10, max: 100, step: 1 },
  vw: { min: 10, max: 100, step: 1 },
  rem: { min: 5, max: 120, step: 0.5 },
};

export const OVERLAY_HEIGHT_UNITS = ['vh', 'px', '%'] as const;
export const OVERLAY_HEIGHT_LIMITS: Record<
  (typeof OVERLAY_HEIGHT_UNITS)[number],
  Limits
> = {
  vh: { min: 10, max: 100, step: 1 },
  px: { min: 100, max: 1600, step: 1 },
  '%': { min: 10, max: 100, step: 1 },
};

export const OVERLAY_RADIUS_UNITS = PROP_UNITS.radius;

/** Older saves stored these names; the numbers match the classes they rendered. */
const LEGACY_RADIUS: Record<string, number> = {
  none: 0,
  sm: 8,
  md: 14,
  lg: 16,
  full: 24,
};
const LEGACY_PADDING: Record<string, Responsive<number>> = {
  none: { desktop: 0 },
  sm: { desktop: 16 },
  md: { desktop: 24 },
  lg: { desktop: 40, mobile: 32 },
};

const isObj = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNum = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const clamp = (n: number, { min, max }: { min: number; max: number }) =>
  Math.min(max, Math.max(min, n));

const defaultsFor = (category: OverlayCategory) =>
  (category === 'Drawer' ? DEFAULT_DRAWER_SETTINGS : DEFAULT_POPUP_SETTINGS)
    .layout;

function pickUnit<U extends string>(
  unit: unknown,
  units: readonly U[],
  fallback: U
): U {
  return units.includes(unit as U) ? (unit as U) : fallback;
}

function readResponsiveNumber(value: unknown): Responsive<number> | undefined {
  if (!isObj(value)) return undefined;
  const out: Responsive<number> = {};
  for (const device of DEVICES) {
    if (isNum(value[device])) out[device] = value[device];
  }
  return Object.keys(out).length ? out : undefined;
}

/** `'480px'`, `'auto'`, or a saved `{ value, unit }`. Anything else takes the default. */
function readLength(
  raw: unknown,
  units: readonly LengthUnit[],
  fallback: OverlayLength
): OverlayLength {
  const fallbackUnit = fallback.unit ?? units[0];

  if (typeof raw === 'string') {
    const text = raw.trim();
    if (text === 'auto') return { unit: fallbackUnit };
    const match = /^(\d+(?:\.\d+)?)(px|%|vw|vh|rem|em)$/.exec(text);
    if (match && units.includes(match[2] as LengthUnit)) {
      return {
        value: { desktop: Number(match[1]) },
        unit: match[2] as LengthUnit,
      };
    }
    return fallback;
  }

  if (isObj(raw)) {
    const value = readResponsiveNumber(raw.value);
    const unit = pickUnit(raw.unit, units, fallbackUnit);
    return value ? { value, unit } : { unit };
  }

  return fallback;
}

function readRadius(raw: unknown, fallback: OverlayLength): OverlayLength {
  if (typeof raw === 'string') {
    const legacy = LEGACY_RADIUS[raw];
    return legacy === undefined
      ? fallback
      : { value: { desktop: legacy }, unit: 'px' };
  }
  return readLength(raw, OVERLAY_RADIUS_UNITS, fallback);
}

function readPadding(raw: unknown, fallback: OverlayPadding): OverlayPadding {
  if (typeof raw === 'string') {
    const legacy = LEGACY_PADDING[raw];
    if (!legacy) return fallback;
    const value: Responsive<Sides> = {};
    for (const device of DEVICES) {
      const n = legacy[device];
      if (n !== undefined) {
        value[device] = { top: n, right: n, bottom: n, left: n };
      }
    }
    return { value, unit: 'px' };
  }

  if (!isObj(raw)) return fallback;

  const unit = pickUnit<SpacingUnit>(
    raw.unit,
    SPACING_UNITS,
    fallback.unit ?? 'px'
  );
  if (!isObj(raw.value)) return { unit };

  const value: Responsive<Sides> = {};
  for (const device of DEVICES) {
    const sides = raw.value[device];
    if (!isObj(sides)) continue;
    const clean: Sides = {};
    for (const side of SIDES) {
      if (isNum(sides[side])) clean[side] = sides[side];
    }
    if (Object.keys(clean).length) value[device] = clean;
  }
  return Object.keys(value).length ? { value, unit } : { unit };
}

const toHex = (channel: string) =>
  Math.min(255, Number(channel)).toString(16).padStart(2, '0');

function readBackdrop(raw: unknown, fallback: OverlayBackdrop): OverlayBackdrop {
  if (isObj(raw)) {
    return {
      color: safeColor(raw.color) ?? fallback.color,
      opacity: isNum(raw.opacity)
        ? clamp(raw.opacity, { min: 0, max: 100 })
        : fallback.opacity,
    };
  }

  const color = safeColor(raw);
  if (!color) return fallback;

  // The picker only edits solid colors, so `rgba()` splits into hex + opacity.
  const rgba =
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
      color
    );
  if (rgba) {
    return {
      color: `#${toHex(rgba[1])}${toHex(rgba[2])}${toHex(rgba[3])}`,
      opacity:
        rgba[4] === undefined
          ? 100
          : Math.round(clamp(Number(rgba[4]), { min: 0, max: 1 }) * 100),
    };
  }
  return { color, opacity: 100 };
}

export type OverlayLayoutStyle = Pick<
  OverlayLayout,
  'width' | 'maxHeight' | 'radius' | 'padding' | 'overlayColor' | 'background'
>;

/** Reads the style fields of `layout` root props, converting older saved shapes. */
export function readOverlayLayout(
  raw: unknown,
  category: OverlayCategory
): OverlayLayoutStyle {
  const layout = isObj(raw) ? raw : {};
  const d = defaultsFor(category);
  return {
    width: readLength(layout.width, OVERLAY_WIDTH_UNITS, d.width ?? {}),
    maxHeight: readLength(
      layout.maxHeight,
      OVERLAY_HEIGHT_UNITS,
      d.maxHeight ?? {}
    ),
    radius: readRadius(layout.radius, d.radius ?? {}),
    padding: readPadding(layout.padding, d.padding ?? {}),
    overlayColor: readBackdrop(
      layout.overlayColor,
      d.overlayColor ?? { color: '#000000', opacity: 50 }
    ),
    background: safeColor(layout.background) ?? d.background,
  };
}

const SUFFIX: Record<Device, string> = {
  desktop: 'd',
  tablet: 't',
  mobile: 'm',
};

function lengthAt(
  length: OverlayLength | undefined,
  device: Device,
  limits: Record<string, Limits>,
  fallbackUnit: string
): string | undefined {
  const unit = length?.unit && limits[length.unit] ? length.unit : fallbackUnit;
  const n = resolveResponsive(length?.value, device, v =>
    isNum(v) ? v : undefined
  );
  return n === undefined ? undefined : `${clamp(n, limits[unit])}${unit}`;
}

function paddingAt(padding: OverlayPadding | undefined, device: Device) {
  const unit = pickUnit<SpacingUnit>(padding?.unit, SPACING_UNITS, 'px');
  return SIDES.map(side => {
    // Each side inherits on its own, so the validator picks one out of `Sides`.
    const n = resolveResponsive<number>(
      padding?.value as unknown as Responsive<number>,
      device,
      v => (isObj(v) && isNum(v[side]) ? v[side] : undefined)
    );
    return n === undefined ? '0' : `${clamp(n, SPACING_LIMITS[unit])}${unit}`;
  }).join(' ');
}

const POPUP_MAX_HEIGHT = 'calc(100dvh - 2rem)';

/**
 * The `--ov-*` variables `.s-ov-panel` (site.css) reads. One set per device, so
 * the same output works on the site and in the device-sized editor canvas.
 */
export function resolveOverlayPanelStyle(
  layout: OverlayLayoutStyle,
  category: OverlayCategory,
  position?: string
): CSSProperties {
  const d = defaultsFor(category);
  const edgeDrawer =
    category === 'Drawer' && (position === 'top' || position === 'bottom');
  const sideDrawer = category === 'Drawer' && !edgeDrawer;
  const vars: Record<string, string> = {};

  for (const device of DEVICES) {
    const key = SUFFIX[device];
    vars[`--ov-w-${key}`] = edgeDrawer
      ? '100%'
      : (lengthAt(layout.width, device, OVERLAY_WIDTH_LIMITS, 'px') ??
        lengthAt(d.width, device, OVERLAY_WIDTH_LIMITS, 'px') ??
        '100%');
    vars[`--ov-mh-${key}`] = sideDrawer
      ? 'none'
      : (lengthAt(layout.maxHeight, device, OVERLAY_HEIGHT_LIMITS, 'vh') ??
        (category === 'Popup' ? POPUP_MAX_HEIGHT : 'none'));
    vars[`--ov-p-${key}`] = paddingAt(layout.padding, device);
    vars[`--ov-rad-${key}`] =
      lengthAt(layout.radius, device, LENGTH_LIMITS, 'px') ?? '0';
  }

  return vars as CSSProperties;
}

/** The backdrop's CSS color. `color-mix` also fades theme `var(--…)` colors. */
export function resolveBackdropColor(
  backdrop: OverlayBackdrop | undefined
): string | undefined {
  const color = safeColor(backdrop?.color);
  if (!color) return undefined;
  const opacity = backdrop?.opacity ?? 100;
  if (opacity >= 100) return color;
  if (opacity <= 0) return 'transparent';
  return `color-mix(in srgb, ${color} ${opacity}%, transparent)`;
}
