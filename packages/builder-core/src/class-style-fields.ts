/**
 * What the class style editor edits (KRK-03): the CSS controls a style class
 * offers, the states it can target, and where a shown value comes from.
 *
 * A class stores plain CSS declarations per variant (`tablet:hover`), so its
 * editor uses its own CSS controls rather than each block's settings fields.
 * Every property here is on STYLE_CLASS_CSS_PROPERTIES (checked by tests).
 */

import { type BreakpointConfig, DEFAULT_BREAKPOINTS, type Device, fallbackFor } from './fields';
import {
  type CssDeclarations,
  formatVariantKey,
  isValidState,
  parseVariantKey,
  type StyleClass,
} from './style-classes';

export type ClassStyleControl =
  | { kind: 'length'; placeholder?: string }
  | { kind: 'color' }
  | { kind: 'select'; options: readonly string[] }
  | { kind: 'text'; placeholder?: string };

export type ClassStyleProperty = {
  /** camelCase CSS property, as stored in variants. */
  prop: string;
  label: string;
  control: ClassStyleControl;
};

export type ClassStyleGroup = { id: string; label: string; properties: ClassStyleProperty[] };

const length = (placeholder?: string): ClassStyleControl => ({ kind: 'length', placeholder });
const select = (...options: string[]): ClassStyleControl => ({ kind: 'select', options });
const color: ClassStyleControl = { kind: 'color' };
const text = (placeholder?: string): ClassStyleControl => ({ kind: 'text', placeholder });

/** The class editor's sections, in inspector order. */
export const CLASS_STYLE_GROUPS: readonly ClassStyleGroup[] = [
  {
    id: 'layout',
    label: 'Layout',
    properties: [
      { prop: 'display', label: 'Display', control: select('block', 'flex', 'grid', 'inline', 'inline-block', 'inline-flex', 'none') },
      { prop: 'flexDirection', label: 'Direction', control: select('row', 'row-reverse', 'column', 'column-reverse') },
      { prop: 'flexWrap', label: 'Wrap', control: select('nowrap', 'wrap', 'wrap-reverse') },
      { prop: 'justifyContent', label: 'Justify', control: select('flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly') },
      { prop: 'alignItems', label: 'Align', control: select('stretch', 'flex-start', 'center', 'flex-end', 'baseline') },
      { prop: 'gap', label: 'Gap', control: length('16px') },
      { prop: 'gridTemplateColumns', label: 'Grid columns', control: text('repeat(3, 1fr)') },
    ],
  },
  {
    id: 'spacing',
    label: 'Spacing',
    properties: [
      { prop: 'paddingTop', label: 'Padding top', control: length() },
      { prop: 'paddingRight', label: 'Padding right', control: length() },
      { prop: 'paddingBottom', label: 'Padding bottom', control: length() },
      { prop: 'paddingLeft', label: 'Padding left', control: length() },
      { prop: 'marginTop', label: 'Margin top', control: length() },
      { prop: 'marginRight', label: 'Margin right', control: length() },
      { prop: 'marginBottom', label: 'Margin bottom', control: length() },
      { prop: 'marginLeft', label: 'Margin left', control: length() },
    ],
  },
  {
    id: 'size',
    label: 'Size',
    properties: [
      { prop: 'width', label: 'Width', control: length('auto') },
      { prop: 'height', label: 'Height', control: length('auto') },
      { prop: 'minWidth', label: 'Min width', control: length() },
      { prop: 'maxWidth', label: 'Max width', control: length() },
      { prop: 'minHeight', label: 'Min height', control: length() },
      { prop: 'maxHeight', label: 'Max height', control: length() },
      { prop: 'overflow', label: 'Overflow', control: select('visible', 'hidden', 'auto', 'scroll') },
    ],
  },
  {
    id: 'position',
    label: 'Position',
    properties: [
      { prop: 'position', label: 'Position', control: select('static', 'relative', 'absolute', 'fixed', 'sticky') },
      { prop: 'top', label: 'Top', control: length() },
      { prop: 'right', label: 'Right', control: length() },
      { prop: 'bottom', label: 'Bottom', control: length() },
      { prop: 'left', label: 'Left', control: length() },
      { prop: 'zIndex', label: 'Z-index', control: text('1') },
    ],
  },
  {
    id: 'typography',
    label: 'Typography',
    properties: [
      { prop: 'fontFamily', label: 'Font', control: text('Inter, sans-serif') },
      { prop: 'fontSize', label: 'Size', control: length('16px') },
      { prop: 'fontWeight', label: 'Weight', control: select('300', '400', '500', '600', '700', '800') },
      { prop: 'lineHeight', label: 'Line height', control: length('1.5') },
      { prop: 'letterSpacing', label: 'Letter spacing', control: length('0') },
      { prop: 'textAlign', label: 'Align', control: select('left', 'center', 'right', 'justify') },
      { prop: 'textTransform', label: 'Case', control: select('none', 'uppercase', 'lowercase', 'capitalize') },
      { prop: 'color', label: 'Color', control: color },
    ],
  },
  {
    id: 'background',
    label: 'Background',
    properties: [
      { prop: 'backgroundColor', label: 'Color', control: color },
      { prop: 'backgroundImage', label: 'Image', control: text('linear-gradient(…)') },
    ],
  },
  {
    id: 'border',
    label: 'Border',
    properties: [
      { prop: 'borderWidth', label: 'Width', control: length('1px') },
      { prop: 'borderStyle', label: 'Style', control: select('none', 'solid', 'dashed', 'dotted') },
      { prop: 'borderColor', label: 'Color', control: color },
      { prop: 'borderRadius', label: 'Radius', control: length('8px') },
    ],
  },
  {
    id: 'effects',
    label: 'Effects',
    properties: [
      { prop: 'opacity', label: 'Opacity', control: text('1') },
      { prop: 'boxShadow', label: 'Shadow', control: text('0 1px 2px rgba(0,0,0,.1)') },
      { prop: 'transform', label: 'Transform', control: text('translateY(-2px)') },
      { prop: 'transition', label: 'Transition', control: text('all 150ms ease') },
      { prop: 'cursor', label: 'Cursor', control: select('auto', 'pointer', 'default', 'text', 'not-allowed') },
    ],
  },
];

/** `content` for ::before / ::after, shown only for those states. */
export const CLASS_CONTENT_PROPERTY: ClassStyleProperty = {
  prop: 'content',
  label: 'Content',
  control: text('"→"'),
};

export type ClassStateOption = { value: string; label: string; group: 'state' | 'pseudo-element' | 'structure' };

/** States the picker offers. `nth-child(…)` takes a formula typed by the user. */
export const CLASS_STATE_OPTIONS: readonly ClassStateOption[] = [
  { value: 'hover', label: 'Hover', group: 'state' },
  { value: 'focus', label: 'Focus', group: 'state' },
  { value: 'focus-visible', label: 'Focus visible', group: 'state' },
  { value: 'active', label: 'Pressed', group: 'state' },
  { value: 'visited', label: 'Visited', group: 'state' },
  { value: 'disabled', label: 'Disabled', group: 'state' },
  { value: 'before', label: '::before', group: 'pseudo-element' },
  { value: 'after', label: '::after', group: 'pseudo-element' },
  { value: 'placeholder', label: '::placeholder', group: 'pseudo-element' },
  { value: 'first-child', label: 'First child', group: 'structure' },
  { value: 'last-child', label: 'Last child', group: 'structure' },
];

/** States that can be previewed on the canvas by forcing them on the element. */
export const FORCEABLE_STATES: ReadonlySet<string> = new Set([
  'hover',
  'focus',
  'focus-visible',
  'active',
  'visited',
  'disabled',
]);

export type ClassValueSource =
  /** Set on exactly the variant being edited. */
  | { kind: 'own'; value: string }
  /** Comes from a wider breakpoint or from the state-less style. */
  | { kind: 'inherited'; value: string; from: { device: string; state: string | null } }
  | { kind: 'none' };

/**
 * Where the value of `prop` comes from when editing `device` + `state`, the
 * way the compiled CSS cascades: the exact variant, then wider breakpoints
 * with the same state, then (for a state) the state-less style on the same
 * breakpoint chain.
 */
export function resolveClassValue(
  cls: Pick<StyleClass, 'variants'>,
  prop: string,
  device: Device,
  state: string | null,
  breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS
): ClassValueSource {
  const chain = fallbackFor(device, breakpoints);
  const states: (string | null)[] = state ? [state, null] : [null];
  for (const candidateState of states) {
    for (const candidateDevice of chain) {
      const value = cls.variants[formatVariantKey(candidateDevice, candidateState)]?.[prop];
      if (value === undefined || value === '') continue;
      if (candidateDevice === device && candidateState === state) return { kind: 'own', value };
      return { kind: 'inherited', value, from: { device: candidateDevice, state: candidateState } };
    }
  }
  return { kind: 'none' };
}

/**
 * Sets (or with `undefined`/empty, clears) one declaration on one variant.
 * Empty variants are removed. Returns new variants; the input is unchanged.
 */
export function setClassVariantValue(
  variants: Record<string, CssDeclarations>,
  device: Device,
  state: string | null,
  prop: string,
  value: string | undefined
): Record<string, CssDeclarations> {
  if (!isValidState(state)) return variants;
  const key = formatVariantKey(device, state);
  const current = { ...(variants[key] ?? {}) };
  const trimmed = value?.trim();
  if (trimmed) current[prop] = trimmed;
  else delete current[prop];
  const next = { ...variants };
  if (Object.keys(current).length) next[key] = current;
  else delete next[key];
  return next;
}

/** States that already have at least one value on any breakpoint, for the picker's dots. */
export function statesWithValues(cls: Pick<StyleClass, 'variants'>): Set<string> {
  const used = new Set<string>();
  for (const [key, decls] of Object.entries(cls.variants)) {
    const { state } = parseVariantKey(key);
    if (state && Object.keys(decls).length) used.add(state);
  }
  return used;
}
