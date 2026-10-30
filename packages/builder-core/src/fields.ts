/**
 * Inspector field definitions (R693, R783, R784) and per-device values
 * (R694). Field types are open: hosts register their own with `defineField`
 * in builder-react, and any type name not built in is looked up there.
 */

/** Devices a value can differ on; desktop is the base. */
export type Device = 'desktop' | 'tablet' | 'mobile';
export const DEVICES: Device[] = ['desktop', 'tablet', 'mobile'];

/** A value set per device; unset devices inherit. */
export type Responsive<T> = Partial<Record<Device, T>>;

/** Where each device looks for a value, nearest first (matches the CMS style system). */
export const DEVICE_FALLBACK: Record<Device, Device[]> = {
  desktop: ['desktop', 'tablet', 'mobile'],
  tablet: ['tablet', 'desktop', 'mobile'],
  mobile: ['mobile', 'tablet', 'desktop'],
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
export function valueForDevice<T>(value: T | Responsive<T> | undefined, device: Device): T | undefined {
  if (!isResponsive<T>(value)) return value as T | undefined;
  for (const candidate of DEVICE_FALLBACK[device]) {
    if (value[candidate] !== undefined) return value[candidate];
  }
  return undefined;
}

/** Which device the shown value comes from, or null when nothing is set. */
export function inheritedFrom<T>(value: T | Responsive<T> | undefined, device: Device): Device | null {
  if (value === undefined) return null;
  if (!isResponsive<T>(value)) return 'desktop';
  return DEVICE_FALLBACK[device].find(candidate => value[candidate] !== undefined) ?? null;
}

/** Sets one device's value, turning a plain value into a per-device one (the plain value becomes desktop). */
export function withDeviceValue<T>(value: T | Responsive<T> | undefined, device: Device, next: T): Responsive<T> {
  const base: Responsive<T> = isResponsive<T>(value)
    ? { ...value }
    : value === undefined
      ? {}
      : { desktop: value as T };
  return { ...base, [device]: next };
}

/** Clears one device's value so it inherits again; returns undefined when nothing is left. */
export function resetDeviceValue<T>(value: T | Responsive<T> | undefined, device: Device): Responsive<T> | undefined {
  if (!isResponsive<T>(value)) return device === 'desktop' ? undefined : (value as Responsive<T>);
  const next = { ...value };
  delete next[device];
  return Object.keys(next).length ? next : undefined;
}

/* ---------- field definitions ---------- */

export type FieldOption = { label: string; value: string | number | boolean };

type BaseField<P> = {
  label?: string;
  description?: string;
  /** Inspector section; fields with the same group are shown together (R784). */
  group?: string;
  /** Show the field only when this returns true; hidden values are kept (BLD-33). */
  when?: (props: P) => boolean;
  readOnly?: boolean;
  /** Edit one value per device, with inheritance and reset (R694). */
  responsive?: boolean;
  /** Render the R723 visual style control row (draggable number, token picker) for this field. */
  visual?: boolean;
  /** Design token units for the R723 visual controls (draggable number unit, token values). */
  unit?: string;
  /** Design tokens for R723 token pickers. */
  tokens?: { value: string; label: string; color?: string }[];
};

export type FieldDef<P = Record<string, unknown>> =
  | (BaseField<P> & { type: 'text' | 'textarea' | 'url' | 'color' | 'image'; placeholder?: string })
  | (BaseField<P> & { type: 'number'; min?: number; max?: number; step?: number; unit?: string })
  | (BaseField<P> & { type: 'toggle' })
  | (BaseField<P> & { type: 'select' | 'radio'; options: FieldOption[] })
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
  | (BaseField<P> & { type: `custom:${string}` | 'custom'; [option: string]: unknown });

export type Fields<P = Record<string, unknown>> = { [K in keyof P]?: FieldDef<P> };
