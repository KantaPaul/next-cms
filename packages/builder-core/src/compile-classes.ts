/**
 * CSS compiler for persisted style classes (KRK-02).
 *
 * Turns `StyleClass[]` into a deterministic CSS string, grouped by device in
 * the site's cascade order; within each device, tag styles come first, then
 * base classes, then combos. Every declaration is run through
 * `filterStyleClassCss` / `sanitizeCssValue`, and class and tag names are
 * checked again before they reach a selector.
 */

import {
  type BreakpointConfig,
  CASCADE_MEDIA_DEVICES,
  cascadeMediaQueryFor,
  DEFAULT_BREAKPOINTS,
  type Device,
  enabledDevices,
  normalizeBreakpointConfig,
} from './fields';
import { sanitizeCssValue } from './style-schemas';
import type { StyleClass } from './style-classes';
import {
  allowsCssContent,
  filterStyleClassCss,
  forcedStateSelectorSuffix,
  parseVariantKey,
  stateSelectorSuffix,
} from './style-classes';

/**
 * Version of the compiled output. Bump it whenever the CSS this file emits
 * changes, so cached CSS (the server caches it per site) is rebuilt.
 */
export const STYLE_CLASS_CSS_VERSION = 2;

export type CompileStyleClassesInput = {
  classes: StyleClass[];
  /** When set, only emit these class ids (site build). Undefined = all (editor). */
  usedClassIds?: Set<string>;
  breakpoints: BreakpointConfig;
  scope?: string;
  query?: 'media' | 'container';
  /**
   * Editor canvas only: state rules also match `[data-force-state~="hover"]`,
   * so a chosen state can be previewed on the selected element.
   */
  forceStates?: boolean;
};

function cssProp(prop: string): string {
  return prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}

/** Whether a `content` value is safe for `::before`/`::after`: `none`, `attr(...)`, or a quoted string. */
export function isValidCssContent(value: string): boolean {
  if (value === 'none') return true;
  if (/^attr\([^)]*\)$/.test(value)) return true;
  return /^['"][\s\S]*['"]$/.test(value);
}

function filterDeclarations(
  styles: Record<string, string>,
  allowContent: boolean
): Record<string, string> | null {
  const base = filterStyleClassCss(styles);
  const result: Record<string, string> = { ...base };
  if (allowContent && styles.content !== undefined && styles.content !== null) {
    const sanitized = sanitizeCssValue(styles.content);
    if (sanitized !== null && isValidCssContent(sanitized)) {
      result.content = sanitized;
    }
  }
  return Object.keys(result).length ? result : null;
}

function declarationsString(decls: Record<string, string>): string {
  return Object.entries(decls)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prop, value]) => `${cssProp(prop)}:${value};`)
    .join('');
}

/** Safe CSS identifiers: what styleClassNameSchema / styleClassTagSchema allow. */
const CLASS_NAME = /^[a-z][a-z0-9-]{0,79}$/;
const TAG_NAME = /^[a-z][a-z0-9]{0,15}$/;

type Rule = { selector: string; decls: Record<string, string> };

/** Selector for a class without its state suffix, or null if it can't be compiled safely. */
/**
 * Selector for a class without its state suffix, or null if it can't be
 * compiled safely.
 *
 * Specificity is kept at one class (`:where()` adds none), so the cascade is:
 * Tailwind utilities < classes (emitted later in the page) < the block's own
 * settings (`.site-root .s-*` rules and inline styles). A combo has the same
 * specificity as its base and wins by coming after it.
 */
function baseSelector(
  cls: StyleClass,
  byId: Map<string, StyleClass>,
  scope: string
): string | null {
  const root = `:where(${scope})`;
  if (cls.kind === 'tag') {
    return cls.tag && TAG_NAME.test(cls.tag) ? `${root} ${cls.tag}` : null;
  }
  if (!CLASS_NAME.test(cls.name)) return null;
  if (cls.comboOf === undefined) return `${root} .c-${cls.name}`;
  const base = byId.get(cls.comboOf);
  // A combo needs a plain (non-combo) base class; otherwise it never applies.
  if (!base || base.kind !== 'class' || base.comboOf !== undefined) return null;
  if (!CLASS_NAME.test(base.name)) return null;
  return `${root} .c-${cls.name}:where(.c-${base.name})`;
}

/**
 * Adds one class's rules to the per-device buckets. Variants for disabled
 * devices and variants with an unknown or unsafe state are skipped.
 */
function collectRules(
  cls: StyleClass,
  selectorBase: string,
  enabled: Set<string>,
  buckets: Map<Device, Rule[]>,
  forceStates: boolean
): void {
  const keys = Object.keys(cls.variants).sort();
  for (const key of keys) {
    const { device, state } = parseVariantKey(key);
    if (!enabled.has(device)) continue;
    const suffix = stateSelectorSuffix(state);
    // Unknown or unsafe state: skip, never fall back to the base selector.
    if (suffix === null) continue;
    const decls = filterDeclarations(cls.variants[key], allowsCssContent(state));
    if (!decls) continue;
    const forced = forceStates ? forcedStateSelectorSuffix(state) : null;
    const selector = forced
      ? `${selectorBase}${suffix},${selectorBase}${forced}`
      : `${selectorBase}${suffix}`;
    buckets.get(device as Device)?.push({ selector, decls });
  }
}

function wrap(block: string, mq: string | null, query: 'media' | 'container'): string {
  if (!mq) return block;
  if (query === 'container') return `@container canvas ${mq}{${block}}`;
  return `@media ${mq}{${block}}`;
}

/**
 * Compiles style classes to a CSS string.
 *
 * - Output is grouped by device in cascade order: the desktop base, then
 *   widescreen (min-width), then smaller breakpoints largest to smallest
 *   (max-width). A tablet value therefore also applies on phones unless
 *   mobile sets its own, the same as block props (responsive-css).
 * - Within each device: tag styles, then base classes, then combo classes.
 * - `usedClassIds` undefined emits every class (editor canvas); a set emits
 *   only those ids (published site). A used combo also needs its base class.
 * - `query: 'container'` wraps conditional rules in `@container canvas (...)`.
 */
export function compileStyleClasses(input: CompileStyleClassesInput): string {
  const {
    classes,
    usedClassIds,
    breakpoints = DEFAULT_BREAKPOINTS,
    scope = '.site-root',
    query = 'media',
    forceStates = false,
  } = input;
  const config = normalizeBreakpointConfig(breakpoints);
  const enabled = new Set<string>(enabledDevices(config));
  const byId = new Map(classes.map(c => [c.id, c]));
  const devices: Device[] = ['desktop', ...CASCADE_MEDIA_DEVICES];

  const selected = (usedClassIds
    ? classes.filter(c => usedClassIds.has(c.id))
    : classes.slice()
  ).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const groups: StyleClass[][] = [
    selected.filter(c => c.kind === 'tag'),
    selected.filter(c => c.kind === 'class' && c.comboOf === undefined),
    selected.filter(c => c.kind === 'class' && c.comboOf !== undefined),
  ];

  const buckets = new Map<Device, Rule[]>(devices.map(d => [d, []]));
  for (const group of groups) {
    for (const cls of group) {
      const selectorBase = baseSelector(cls, byId, scope);
      if (selectorBase !== null) collectRules(cls, selectorBase, enabled, buckets, forceStates);
    }
  }

  const out: string[] = [];
  for (const device of devices) {
    const rules = buckets.get(device) ?? [];
    if (!rules.length) continue;
    const block = rules
      .map(rule => `${rule.selector}{${declarationsString(rule.decls)}}`)
      .join('');
    out.push(wrap(block, cascadeMediaQueryFor(device, config), query));
  }
  return out.join('\n');
}
