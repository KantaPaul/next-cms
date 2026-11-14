/**
 * Inspector field definitions (R693, R783, R784) and per-device values
 * (R694). Field types are open: hosts register their own with `defineField`
 * in builder-react, and any type name not built in is looked up there.
 */

/** Devices a value can differ on, largest to smallest; desktop is the base. */
export type Device =
  | 'widescreen'
  | 'desktop'
  | 'laptop'
  | 'tablet_extra'
  | 'tablet'
  | 'mobile_extra'
  | 'mobile';

export const DEVICES: Device[] = [
  'widescreen',
  'desktop',
  'laptop',
  'tablet_extra',
  'tablet',
  'mobile_extra',
  'mobile',
];

export type BreakpointEntry = {
  device: Device;
  label: string;
  width: number;
  enabled: boolean;
};

export type BreakpointConfig = BreakpointEntry[];

export const DEFAULT_BREAKPOINTS: BreakpointConfig = [
  { device: 'widescreen', label: 'Widescreen', width: 2400, enabled: false },
  { device: 'desktop', label: 'Desktop', width: 1400, enabled: true },
  { device: 'laptop', label: 'Laptop', width: 1366, enabled: false },
  { device: 'tablet_extra', label: 'Tablet Extra', width: 1200, enabled: false },
  { device: 'tablet', label: 'Tablet', width: 1023, enabled: true },
  { device: 'mobile_extra', label: 'Mobile Extra', width: 880, enabled: false },
  { device: 'mobile', label: 'Mobile', width: 767, enabled: true },
];

const DEFAULT_BY_DEVICE = new Map<Device, BreakpointEntry>(
  DEFAULT_BREAKPOINTS.map(entry => [entry.device, entry])
);

export const DEVICE_LABELS: Record<Device, string> = {
  widescreen: 'Widescreen',
  desktop: 'Desktop',
  laptop: 'Laptop',
  tablet_extra: 'Tablet Extra',
  tablet: 'Tablet',
  mobile_extra: 'Mobile Extra',
  mobile: 'Mobile',
};

/** Normalizes partial or stored breakpoint config to all 7 devices in canonical order. */
export function normalizeBreakpointConfig(raw: unknown): BreakpointConfig {
  const byDevice = new Map<Device, Partial<BreakpointEntry>>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const d = (item as Record<string, unknown>).device;
      if (typeof d === 'string' && (DEVICES as string[]).includes(d)) {
        byDevice.set(d as Device, item as Partial<BreakpointEntry>);
      }
    }
  }
  return DEVICES.map(device => {
    const def = DEFAULT_BY_DEVICE.get(device)!;
    const saved = byDevice.get(device);
    const rawWidth = saved?.width;
    const width =
      typeof rawWidth === 'number' &&
      Number.isFinite(rawWidth) &&
      rawWidth >= 200 &&
      rawWidth <= 5000
        ? Math.round(rawWidth)
        : def.width;
    const label =
      typeof saved?.label === 'string' && saved.label.trim()
        ? saved.label.trim()
        : def.label;
    const enabled =
      device === 'desktop'
        ? true
        : typeof saved?.enabled === 'boolean'
          ? saved.enabled
          : def.enabled;
    return { device, label, width, enabled };
  });
}

/** Enabled devices in canonical largest-to-smallest order (desktop is always enabled). */
export function enabledDevices(
  config: BreakpointConfig = DEFAULT_BREAKPOINTS
): Device[] {
  const byDevice = new Map(config.map(entry => [entry.device, entry]));
  return DEVICES.filter(
    device => device === 'desktop' || Boolean(byDevice.get(device)?.enabled)
  );
}

/** Validates that media-query widths are integer, within range, unique, and strictly descending. */
export function validateBreakpoints(
  config: BreakpointConfig
): { ok: true } | { ok: false; error: string } {
  const byDevice = new Map(config.map(entry => [entry.device, entry]));
  const orderedMediaDevices: Device[] = [
    'widescreen',
    'laptop',
    'tablet_extra',
    'tablet',
    'mobile_extra',
    'mobile',
  ];
  const seenWidths = new Set<number>();
  let prevWidth = Infinity;
  let prevLabel = '';

  for (const device of orderedMediaDevices) {
    const entry = byDevice.get(device);
    const label = entry?.label || DEVICE_LABELS[device];
    if (!entry || typeof entry.width !== 'number' || !Number.isFinite(entry.width)) {
      return { ok: false, error: `${label} width must be a valid number.` };
    }
    if (!Number.isInteger(entry.width) || entry.width < 200 || entry.width > 5000) {
      return {
        ok: false,
        error: `${label} width must be a whole number between 200 and 5000 px.`,
      };
    }
    if (seenWidths.has(entry.width)) {
      return {
        ok: false,
        error: `Duplicate breakpoint width (${entry.width}px) on ${label}.`,
      };
    }
    if (entry.width >= prevWidth) {
      return {
        ok: false,
        error: `${label} (${entry.width}px) must be narrower than ${prevLabel} (${prevWidth}px).`,
      };
    }
    seenWidths.add(entry.width);
    prevWidth = entry.width;
    prevLabel = label;
  }

  return { ok: true };
}

/**
 * Fallback chain for a device given the site's breakpoint config:
 * - desktop is the base: ['desktop']
 * - widescreen inherits from desktop: ['widescreen', 'desktop'] (or ['desktop'] if disabled)
 * - smaller devices walk up through enabled devices to desktop
 */
export function fallbackFor(
  device: Device,
  config: BreakpointConfig = DEFAULT_BREAKPOINTS
): Device[] {
  const enabled = new Set(enabledDevices(config));
  if (device === 'desktop') return ['desktop'];
  if (device === 'widescreen') {
    return enabled.has('widescreen') ? ['widescreen', 'desktop'] : ['desktop'];
  }
  const idx = DEVICES.indexOf(device);
  const chain: Device[] = [];
  for (let i = idx; i >= 1; i--) {
    const candidate = DEVICES[i];
    if (candidate === 'desktop' || enabled.has(candidate)) {
      chain.push(candidate);
    }
  }
  return chain;
}

/**
 * Media-query devices in cascade order: widescreen (min-width) first, then the
 * smaller breakpoints from largest to smallest (max-width). Later rules win,
 * so a tablet value also applies on phones unless mobile sets its own.
 */
export const CASCADE_MEDIA_DEVICES: readonly Device[] = [
  'widescreen',
  'laptop',
  'tablet_extra',
  'tablet',
  'mobile_extra',
  'mobile',
];

/**
 * The cascading media query for style values on a device: `(min-width:W)` for
 * widescreen, `(max-width:W)` for smaller devices, null for the desktop base or
 * a disabled device. Block props (responsive-css) and style classes both use
 * it, so a value set on a breakpoint cascades the same way in both.
 */
export function cascadeMediaQueryFor(
  device: Device,
  config: BreakpointConfig = DEFAULT_BREAKPOINTS
): string | null {
  if (device === 'desktop') return null;
  const entry = config.find(e => e.device === device);
  if (!entry || !enabledDevices(config).includes(device)) return null;
  return device === 'widescreen'
    ? `(min-width:${entry.width}px)`
    : `(max-width:${entry.width}px)`;
}

/**
 * The band media query that matches only one device's own width range, or
 * null for the desktop base. Use it for per-device visibility, not for style
 * values (those cascade; see `cascadeMediaQueryFor`).
 */
export function mediaQueryFor(
  device: Device,
  config: BreakpointConfig = DEFAULT_BREAKPOINTS
): string | null {
  const byDevice = new Map(config.map(e => [e.device, e]));
  const enabled = enabledDevices(config);
  if (!enabled.includes(device)) return null;
  if (device === 'widescreen') {
    return `(min-width:${byDevice.get('widescreen')!.width}px)`;
  }
  const idx = DEVICES.indexOf(device);
  let smallerWidth: number | null = null;
  for (let i = idx + 1; i < DEVICES.length; i++) {
    const d = DEVICES[i];
    if (enabled.includes(d)) {
      smallerWidth = byDevice.get(d)!.width;
      break;
    }
  }
  if (device === 'desktop') {
    const hasWs = enabled.includes('widescreen');
    const parts: string[] = [];
    if (smallerWidth !== null) parts.push(`(min-width:${smallerWidth + 1}px)`);
    if (hasWs) parts.push(`(max-width:${byDevice.get('widescreen')!.width - 1}px)`);
    return parts.length > 0 ? parts.join(' and ') : null;
  }
  const maxW = byDevice.get(device)!.width;
  if (smallerWidth !== null) {
    return `(min-width:${smallerWidth + 1}px) and (max-width:${maxW}px)`;
  }
  return `(max-width:${maxW}px)`;
}

/** Maps a viewport width (px) to the active enabled device. */
export function deviceForWidth(
  width: number,
  config: BreakpointConfig = DEFAULT_BREAKPOINTS
): Device {
  const normalized = normalizeBreakpointConfig(config);
  const byDevice = new Map(normalized.map(entry => [entry.device, entry]));

  const widescreen = byDevice.get('widescreen');
  if (widescreen?.enabled && width >= widescreen.width) {
    return 'widescreen';
  }

  // Check max-width devices from smallest to largest so the narrowest match wins.
  for (const device of [
    'mobile',
    'mobile_extra',
    'tablet',
    'tablet_extra',
    'laptop',
  ] as const) {
    const entry = byDevice.get(device);
    if (entry?.enabled && width <= entry.width) {
      return device;
    }
  }

  return 'desktop';
}

/** Computes canvas preview widths (px) for each device from a breakpoint config. */
export function canvasWidthsFromConfig(
  config: BreakpointConfig = DEFAULT_BREAKPOINTS
): Record<Device, number> {
  const normalized = normalizeBreakpointConfig(config);
  const byDevice = new Map(normalized.map(entry => [entry.device, entry]));
  const enabled = enabledDevices(normalized);

  const smallerEnabledWidth = (device: Device): number => {
    const idx = DEVICES.indexOf(device);
    for (let i = idx + 1; i < DEVICES.length; i++) {
      const d = DEVICES[i];
      if (enabled.includes(d)) {
        return byDevice.get(d)!.width;
      }
    }
    return 0;
  };

  const widescreenEntry = byDevice.get('widescreen')!;
  const laptopEntry = byDevice.get('laptop')!;
  const tabletExtraEntry = byDevice.get('tablet_extra')!;
  const tabletEntry = byDevice.get('tablet')!;
  const mobileExtraEntry = byDevice.get('mobile_extra')!;
  const mobileEntry = byDevice.get('mobile')!;

  const desktopBase = laptopEntry.enabled
    ? Math.max(1400, laptopEntry.width + 1)
    : 1400;
  const desktopWidth = widescreenEntry.enabled
    ? Math.min(desktopBase, widescreenEntry.width - 1)
    : desktopBase;

  const tabletPreview = Math.min(
    tabletEntry.width,
    Math.max(768, smallerEnabledWidth('tablet') + 1)
  );
  const mobilePreview = Math.min(mobileEntry.width, 375);

  return {
    widescreen: widescreenEntry.width,
    desktop: desktopWidth,
    laptop: laptopEntry.width,
    tablet_extra: tabletExtraEntry.width,
    tablet: tabletPreview,
    mobile_extra: mobileExtraEntry.width,
    mobile: mobilePreview,
  };
}

/** A value set per device; unset devices inherit. */
export type Responsive<T> = Partial<Record<Device, T>>;

/** Default fallback order (when using DEFAULT_BREAKPOINTS). */
export const DEVICE_FALLBACK: Record<Device, Device[]> = {
  widescreen: fallbackFor('widescreen', DEFAULT_BREAKPOINTS),
  desktop: fallbackFor('desktop', DEFAULT_BREAKPOINTS),
  laptop: fallbackFor('laptop', DEFAULT_BREAKPOINTS),
  tablet_extra: fallbackFor('tablet_extra', DEFAULT_BREAKPOINTS),
  tablet: fallbackFor('tablet', DEFAULT_BREAKPOINTS),
  mobile_extra: fallbackFor('mobile_extra', DEFAULT_BREAKPOINTS),
  mobile: fallbackFor('mobile', DEFAULT_BREAKPOINTS),
};

export function isResponsive<T>(value: unknown): value is Responsive<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every(key => (DEVICES as string[]).includes(key))
  );
}

/** The value a device shows, following the fallback order. Plain values apply to every device. */
export function valueForDevice<T>(
  value: T | Responsive<T> | undefined,
  device: Device,
  config: BreakpointConfig = DEFAULT_BREAKPOINTS
): T | undefined {
  if (!isResponsive<T>(value)) return value as T | undefined;
  for (const candidate of fallbackFor(device, config)) {
    if (value[candidate] !== undefined) return value[candidate];
  }
  return undefined;
}

/** Which device the shown value comes from, or null when nothing is set. */
export function inheritedFrom<T>(
  value: T | Responsive<T> | undefined,
  device: Device,
  config: BreakpointConfig = DEFAULT_BREAKPOINTS
): Device | null {
  if (value === undefined) return null;
  if (!isResponsive<T>(value)) return 'desktop';
  return (
    fallbackFor(device, config).find(
      candidate => value[candidate] !== undefined
    ) ?? null
  );
}

/** Sets one device's value, turning a plain value into a per-device one (the plain value becomes desktop). */
export function withDeviceValue<T>(
  value: T | Responsive<T> | undefined,
  device: Device,
  next: T
): Responsive<T> {
  const base: Responsive<T> = isResponsive<T>(value)
    ? { ...value }
    : value === undefined
      ? {}
      : { desktop: value as T };
  return { ...base, [device]: next };
}

/** Clears one device's value so it inherits again; returns undefined when nothing is left. */
export function resetDeviceValue<T>(
  value: T | Responsive<T> | undefined,
  device: Device
): Responsive<T> | undefined {
  if (!isResponsive<T>(value))
    return device === 'desktop' ? undefined : (value as Responsive<T>);
  const next = { ...value };
  delete next[device];
  return Object.keys(next).length ? next : undefined;
}

/* ---------- field definitions ---------- */

export type FieldOption = { label: string; value: string | number | boolean };

type BaseField<P> = {
  label?: string;
  description?: string;
  /** Explicit tab id: 'content' | 'style' | 'advanced', or a custom id. */
  tab?: string;
  /** Title of the collapsible section inside that tab. */
  section?: string;
  /** Dotted path into props, e.g. 'section.fill' or 'elements.title'. */
  path?: string;
  /** Inspector section; fields with the same group are shown together (R784). */
  group?: string;
  /**
   * Show the field only when this returns true; hidden values are kept (BLD-33).
   * For a field inside a list item, `props` is the item and `parentProps` is the block.
   */
  when?: (props: P, parentProps?: Record<string, unknown>) => boolean;
  /**
   * Show the field only on these devices; all devices when omitted. Combines with
   * `when`. Hidden values are kept, and this doesn't make the value per-device
   * (see `responsive`).
   */
  devices?: Device[];
  readOnly?: boolean;
  /** Edit one value per device, with inheritance and reset (R694). */
  responsive?: boolean;
  /** Edit one value per locale; the field came from a `translatable()` schema (R778). */
  translatable?: boolean;
  /**
   * Dynamic data source bindings (R415 / BLD-23): `true` allows them on any
   * type; `false` turns them off for a text field whose value is read as-is
   * (a CSS selector, a date setting).
   */
  dynamic?: boolean;
  /** Render the R723 visual style control row (draggable number, token picker) for this field. */
  visual?: boolean;
  /** Design token units for the R723 visual controls (draggable number unit, token values). */
  unit?: string;
  /** Design tokens for R723 token pickers. */
  tokens?: { value: string; label: string; color?: string }[];
};

export type FieldDef<P = Record<string, unknown>> =
  | (BaseField<P> & {
      type: 'text' | 'textarea' | 'url' | 'color' | 'image';
      placeholder?: string;
    })
  | (BaseField<P> & {
      type: 'number';
      min?: number;
      max?: number;
      step?: number;
      unit?: string;
    })
  /** `defaultValue` is what an unset value shows as; it should match the block's render fallback. */
  | (BaseField<P> & { type: 'toggle'; defaultValue?: boolean })
  | (BaseField<P> & {
      type: 'select' | 'radio';
      options: FieldOption[];
      defaultValue?: FieldOption['value'];
    })
  /** Any subset of an allowlisted set of class names, never a raw class string (R782). */
  | (BaseField<P> & { type: 'class-list'; options: FieldOption[] })
  | (BaseField<P> & {
      type: 'slider';
      min?: number;
      max?: number;
      step?: number;
      unit?: string;
      ticks?: number[];
      defaultValue?: number;
    })
  | (BaseField<P> & {
      type: 'choose';
      options: FieldOption[];
      clearable?: boolean;
    })
  | (BaseField<P> & {
      type: 'dimensions';
      units?: string[];
      allowNegative?: boolean;
    })
  | (BaseField<P> & {
      type: 'typography';
      fonts?: { value: string; label: string }[];
    })
  | (BaseField<P> & {
      type: 'border';
    })
  | (BaseField<P> & {
      type: 'shadow';
      kind?: 'box' | 'text';
    })
  | (BaseField<P> & {
      type: 'background';
    })
  /** A lucide icon id, picked from a searchable popover. */
  | (BaseField<P> & { type: 'icon' })
  /** `{ url, alt }` from the media library; `alt: false` hides alt text. */
  | (BaseField<P> & { type: 'media'; alt?: boolean })
  | (BaseField<P> & {
      type: 'flex';
    })
  | (BaseField<P> & {
      type: 'alignment';
      mode?: 'flex' | 'grid';
    })
  | (BaseField<P> & {
      type: 'easing';
    })
  | (BaseField<P> & {
      type: 'transition';
    })
  | (BaseField<P> & {
      type: 'list';
      item: Record<string, FieldDef>;
      defaultItem?: Record<string, unknown>;
      itemLabel?: (item: Record<string, unknown>, index: number) => string;
      min?: number;
      max?: number;
    })
  | (BaseField<P> & { type: 'object'; fields: Record<string, FieldDef> })
  /** Read-only value worked out from the block's props. */
  | (BaseField<P> & { type: 'computed'; compute: (props: P) => string })
  /** Any other type is a custom field registered by the host. */
  | (BaseField<P> & {
      type: `custom:${string}` | 'custom';
      [option: string]: unknown;
    });

export type Fields<P = Record<string, unknown>> = {
  [K in keyof P]?: FieldDef<P>;
};
