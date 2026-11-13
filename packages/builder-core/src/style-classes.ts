/**
 * Persisted style classes (KRK-01): named, versioned CSS classes that nodes
 * reference by id. Classes compile to real CSS and cascade below block props.
 */

import { ALLOWED_CSS_PROPERTIES, sanitizeCssValue } from './style-schemas';

export type StyleState =
  | 'hover' | 'focus' | 'focus-visible' | 'active' | 'visited' | 'disabled'
  | 'before' | 'after' | 'placeholder'
  | 'first-child' | 'last-child' | `nth-child(${string})`;

export type VariantKey = string;

export type CssDeclarations = Record<string, string>;

export type StyleClass = {
  id: string;
  siteId: string;
  name: string;
  kind: 'class' | 'tag';
  tag?: string;
  /**
   * Combo classes only: id of the base class this one modifies. Its styles
   * apply only where both are present (`.c-button.c-is-large`).
   */
  comboOf?: string;
  variants: Record<VariantKey, CssDeclarations>;
  createdAt: string;
  updatedAt: string;
};

/**
 * CSS properties a style class may set (camelCase). A superset of the
 * block-prop allow-list (`ALLOWED_CSS_PROPERTIES`), adding the spacing, size,
 * position, grid and effect properties the class inspector edits. `content`
 * is not listed: it is allowed only on ::before/::after (see allowsCssContent).
 */
export const STYLE_CLASS_CSS_PROPERTIES: ReadonlySet<string> = new Set<string>([
  ...ALLOWED_CSS_PROPERTIES,
  // Spacing
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  // Size
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'aspectRatio', 'boxSizing', 'overflow', 'overflowX', 'overflowY',
  'objectFit', 'objectPosition',
  // Position
  'position', 'top', 'right', 'bottom', 'left', 'inset', 'zIndex',
  // Flex & grid
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'order',
  'alignSelf', 'alignContent', 'justifyItems', 'justifySelf',
  'gridTemplateColumns', 'gridTemplateRows', 'gridAutoFlow',
  'gridAutoColumns', 'gridAutoRows', 'gridColumn', 'gridRow', 'gridArea',
  // Typography extras
  'fontStyle', 'whiteSpace', 'wordBreak', 'textOverflow', 'verticalAlign',
  'listStyleType', 'textDecorationColor', 'textUnderlineOffset',
  // Background extras
  'backgroundAttachment', 'backgroundClip', 'backgroundBlendMode',
  // Outline
  'outline', 'outlineWidth', 'outlineStyle', 'outlineColor', 'outlineOffset',
  // Effects
  'opacity', 'transform', 'transformOrigin', 'transition', 'filter',
  'backdropFilter', 'mixBlendMode', 'cursor', 'pointerEvents', 'visibility',
]);

/** Keeps only allowed class properties whose values pass `sanitizeCssValue`. */
export function filterStyleClassCss(
  styles: Record<string, string | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [prop, value] of Object.entries(styles)) {
    if (!STYLE_CLASS_CSS_PROPERTIES.has(prop) || value === undefined || value === null) continue;
    const sanitized = sanitizeCssValue(String(value));
    if (sanitized !== null) result[prop] = sanitized;
  }
  return result;
}

const STATE_SELECTOR: Record<string, string> = {
  hover: ':hover',
  focus: ':focus',
  'focus-visible': ':focus-visible',
  active: ':active',
  visited: ':visited',
  disabled: ':disabled',
  placeholder: '::placeholder',
  before: '::before',
  after: '::after',
  'first-child': ':first-child',
  'last-child': ':last-child',
};

const NTH_CHILD = /^nth-child\((.+)\)$/;
const NTH_CHILD_FORMULA = /^(odd|even|-?\d*n?([+-]\d+)?)$/;

/** Splits `desktop:hover:before` into { device: 'desktop', state: 'hover:before' }. */
export function parseVariantKey(key: VariantKey): { device: string; state: string | null } {
  const sep = key.indexOf(':');
  if (sep === -1) return { device: key, state: null };
  return { device: key.slice(0, sep), state: key.slice(sep + 1) };
}

/** Joins a device and optional state into a variant key (`desktop`, `tablet:hover`). */
export function formatVariantKey(device: string, state: string | null): VariantKey {
  return state === null ? device : `${device}:${state}`;
}

/** Validates an `nth-child(...)` formula. */
export function isValidNthChild(value: string): boolean {
  if (!value) return false;
  return NTH_CHILD_FORMULA.test(value);
}

const PSEUDO_ELEMENT_PARTS = new Set(['before', 'after', 'placeholder']);

/** Selector suffix for one state part, or null if the part is unknown or unsafe. */
function partSelector(part: string): string | null {
  const mapped = STATE_SELECTOR[part];
  if (mapped) return mapped;
  const nth = NTH_CHILD.exec(part);
  if (nth && isValidNthChild(nth[1])) return `:nth-child(${nth[1]})`;
  return null;
}

/**
 * Whether a state is safe to compile: every part is a known state or a valid
 * `nth-child(...)`, and at most one pseudo-element appears, as the last part.
 * `null` (no state) is valid.
 */
export function isValidState(state: string | null): boolean {
  return stateSelectorSuffix(state) !== null;
}

/**
 * Turns a state string into its CSS selector suffix (`hover:before` →
 * `:hover::before`). Returns null for an unknown or unsafe state, so callers
 * skip the variant instead of applying its styles to the base selector.
 */
export function stateSelectorSuffix(state: string | null): string | null {
  if (state === null) return '';
  const parts = state.split(':');
  let out = '';
  for (const [index, part] of parts.entries()) {
    const selector = partSelector(part);
    if (selector === null) return null;
    if (PSEUDO_ELEMENT_PARTS.has(part) && index !== parts.length - 1) return null;
    out += selector;
  }
  return out;
}

/** Pseudo-classes the editor can force on an element to preview a state. */
const FORCEABLE_PARTS = new Set(['hover', 'focus', 'focus-visible', 'active', 'visited', 'disabled']);

/**
 * Editor-only selector suffix that previews a state without the user
 * hovering: forceable pseudo-classes become `[data-force-state~="hover"]`.
 * Null when the state has nothing to force or is invalid.
 */
export function forcedStateSelectorSuffix(state: string | null): string | null {
  if (!state || stateSelectorSuffix(state) === null) return null;
  const parts = state.split(':');
  if (!parts.some(part => FORCEABLE_PARTS.has(part))) return null;
  return parts
    .map(part => (FORCEABLE_PARTS.has(part) ? `[data-force-state~="${part}"]` : partSelector(part)))
    .join('');
}

/** Whether a variant key's state targets a pseudo-element (`before`/`after`). */
export function isPseudoElementState(state: string | null): boolean {
  if (!state) return false;
  return state.split(':').some(part => PSEUDO_ELEMENT_PARTS.has(part));
}

/** Whether a variant may set `content`: only `::before` and `::after` use it. */
export function allowsCssContent(state: string | null): boolean {
  if (!state) return false;
  return state.split(':').some(part => part === 'before' || part === 'after');
}

export function emptyStyleClass(overrides: {
  id: string; siteId: string; name: string; kind: StyleClass['kind'];
  tag?: string;
}): StyleClass {
  return {
    id: overrides.id,
    siteId: overrides.siteId,
    name: overrides.name,
    kind: overrides.kind,
    tag: overrides.tag,
    variants: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Class names that are safe in a selector and a `class` attribute (same rule as the schema). */
const SAFE_CLASS_NAME = /^[a-z][a-z0-9-]{0,79}$/;

export function isSafeClassName(name: unknown): name is string {
  return typeof name === 'string' && SAFE_CLASS_NAME.test(name);
}

/**
 * Every class id used anywhere in a document or resolved data tree: any
 * `props.classIds` array, including nodes inside loaded global blocks.
 */
export function collectUsedClassIds(value: unknown): Set<string> {
  const used = new Set<string>();
  const seen = new WeakSet<object>();
  const visit = (current: unknown): void => {
    if (!current || typeof current !== 'object' || seen.has(current)) return;
    seen.add(current);
    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }
    const record = current as Record<string, unknown>;
    const props = record.props;
    if (props && typeof props === 'object' && Array.isArray((props as Record<string, unknown>).classIds)) {
      for (const id of (props as Record<string, unknown>).classIds as unknown[]) {
        if (typeof id === 'string' && id) used.add(id);
      }
    }
    for (const key of Object.keys(record)) visit(record[key]);
  };
  visit(value);
  return used;
}

/**
 * The `class` attribute value for a node's class ids: `c-<name>` for each id
 * found in `classes` with a safe name, in order. Unknown ids (e.g. a deleted
 * class) are skipped. Empty string when none apply.
 */
export function styleClassNameFor(
  classIds: unknown,
  classes: Record<string, { name: string }> | undefined
): string {
  if (!classes || !Array.isArray(classIds)) return '';
  const names: string[] = [];
  for (const id of classIds) {
    if (typeof id !== 'string') continue;
    const name = classes[id]?.name;
    if (isSafeClassName(name) && !names.includes(`c-${name}`)) names.push(`c-${name}`);
  }
  return names.join(' ');
}
