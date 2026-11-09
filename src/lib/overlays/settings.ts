import { readOverlayLayout } from './layout-style';
import {
  DEFAULT_DRAWER_SETTINGS,
  DEFAULT_POPUP_SETTINGS,
  type OverlaySettings,
  type OverlayTargeting,
  type PathRule,
  type PathRuleKind,
} from './types';

type Device = OverlayTargeting['devices'][number];

const RULE_KINDS: readonly PathRuleKind[] = [
  'all',
  'exact',
  'prefix',
  'post-type',
  'entity',
];

/** What the builder's "Devices" select stores, mapped to the devices it allows. */
export const DEVICE_SETS: Record<string, Device[]> = {
  all: ['desktop', 'tablet', 'mobile'],
  desktop: ['desktop'],
  'desktop-tablet': ['desktop', 'tablet'],
  'tablet-mobile': ['tablet', 'mobile'],
  mobile: ['mobile'],
};

type Obj = Record<string, unknown>;

const isObj = (value: unknown): value is Obj =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Path rules from the builder's list field. Also accepts a plain string
 * (one path per line or comma): `/blog*` or `/blog/` → prefix, anything else → exact.
 */
export function parsePathRules(value: unknown): PathRule[] | undefined {
  if (value === undefined || value === null) return undefined;

  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        if (part === '*') return { kind: 'all', value: '' } as PathRule;
        if (part.endsWith('*'))
          return { kind: 'prefix', value: part.slice(0, -1) || '/' };
        if (part.length > 1 && part.endsWith('/'))
          return { kind: 'prefix', value: part };
        return { kind: 'exact', value: part };
      });
  }

  if (!Array.isArray(value)) return undefined;
  return value.flatMap(item => {
    if (!isObj(item)) return [];
    const kind = RULE_KINDS.includes(item.kind as PathRuleKind)
      ? (item.kind as PathRuleKind)
      : undefined;
    if (!kind) return [];
    const ruleValue = typeof item.value === 'string' ? item.value.trim() : '';
    // A rule with nothing to match on would silently match nothing; drop it.
    if (kind !== 'all' && !ruleValue) return [];
    return [{ kind, value: ruleValue }];
  });
}

/** Turn a Popup/Drawer document's root props into complete, typed settings. */
export function normalizeOverlaySettings(
  rootProps: unknown,
  category: 'Popup' | 'Drawer'
): OverlaySettings {
  const defaults =
    category === 'Drawer' ? DEFAULT_DRAWER_SETTINGS : DEFAULT_POPUP_SETTINGS;
  const props = isObj(rootProps) ? rootProps : {};
  const layout = isObj(props.layout) ? props.layout : {};
  const trigger = isObj(props.trigger) ? props.trigger : {};
  const targeting = isObj(props.targeting) ? props.targeting : {};
  const frequency = isObj(props.frequency) ? props.frequency : {};
  const d = defaults;

  const deviceSet = str(targeting.deviceSet);
  const devices =
    (deviceSet && DEVICE_SETS[deviceSet]) ||
    (Array.isArray(targeting.devices)
      ? (targeting.devices.filter(v =>
          ['desktop', 'tablet', 'mobile'].includes(v as string)
        ) as Device[])
      : d.targeting.devices);

  const include = parsePathRules(targeting.include);

  return {
    enabled: bool(props.enabled, d.enabled),
    startsAt: str(props.startsAt),
    endsAt: str(props.endsAt),
    layout: {
      ...d.layout,
      position:
        (str(layout.position) as OverlaySettings['layout']['position']) ??
        d.layout.position,
      ...readOverlayLayout(layout, category),
      overlay: bool(layout.overlay, d.layout.overlay),
      closeOnOverlay: bool(layout.closeOnOverlay, d.layout.closeOnOverlay),
      closeOnEsc: bool(layout.closeOnEsc, d.layout.closeOnEsc),
      showCloseButton: bool(layout.showCloseButton, d.layout.showCloseButton),
      animation:
        (str(layout.animation) as OverlaySettings['layout']['animation']) ??
        d.layout.animation,
    },
    trigger: {
      type:
        (str(trigger.type) as OverlaySettings['trigger']['type']) ??
        d.trigger.type,
      delaySec: Math.max(0, num(trigger.delaySec, d.trigger.delaySec ?? 3)),
      scrollPercent: Math.min(
        100,
        Math.max(1, num(trigger.scrollPercent, d.trigger.scrollPercent ?? 50))
      ),
      selector: str(trigger.selector),
    },
    targeting: {
      // An empty include list means "everywhere".
      include: include?.length ? include : [{ kind: 'all', value: '' }],
      exclude: parsePathRules(targeting.exclude) ?? [],
      userState:
        targeting.userState === 'guest' || targeting.userState === 'logged-in'
          ? targeting.userState
          : 'all',
      devices: devices.length ? devices : d.targeting.devices,
    },
    frequency: {
      mode:
        (str(frequency.mode) as OverlaySettings['frequency']['mode']) ??
        d.frequency.mode,
      days: Math.max(1, num(frequency.days, d.frequency.days ?? 7)),
      stopAfterConversion: bool(
        frequency.stopAfterConversion,
        d.frequency.stopAfterConversion
      ),
    },
  };
}
