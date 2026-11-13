/**
 * Visitor-facing filters for External API data (Query Filter → loop).
 *
 * Every input type travels in the same `ext_<key>` URL param, so namespacing,
 * "clear all" and active chips work unchanged. The operator is in the value:
 *   - `electronics`   is one of (select, checkboxes, radio, chips, toggle)
 *   - `~shirt`        contains (text search)
 *   - `10..50`        number range, inclusive; `10..` or `..50` for one side
 *
 * Pure and client-safe: the server matches records with it, the browser
 * builds values and chip labels with it.
 */

import { extractNestedValue } from '@/lib/external-api-schema';

export const EXT_FILTER_STYLES = [
  { value: 'select', label: 'Dropdown select' },
  { value: 'checkboxes', label: 'Checkboxes (multiple)' },
  { value: 'radio', label: 'Radio buttons (one)' },
  { value: 'chips', label: 'Chips / buttons' },
  { value: 'search', label: 'Text search' },
  { value: 'range', label: 'Number range (min–max)' },
  { value: 'toggle', label: 'Yes / no toggle' },
] as const;

export type ExtFilterStyle = (typeof EXT_FILTER_STYLES)[number]['value'];

const STYLE_VALUES = new Set<string>(EXT_FILTER_STYLES.map(s => s.value));

export function isExtFilterStyle(value: unknown): value is ExtFilterStyle {
  return typeof value === 'string' && STYLE_VALUES.has(value);
}

/** Styles that list the field's values as options (and so need facets). */
export function extStyleUsesOptions(style: ExtFilterStyle): boolean {
  return style !== 'search' && style !== 'range';
}

const SEARCH_PREFIX = '~';
const RANGE_RE = /^(-?\d+(?:\.\d+)?)?\.\.(-?\d+(?:\.\d+)?)?$/;

export function encodeExtSearch(text: string): string {
  const t = text.trim();
  return t ? `${SEARCH_PREFIX}${t}` : '';
}

export function encodeExtRange(min?: string, max?: string): string {
  const lo = (min ?? '').trim();
  const hi = (max ?? '').trim();
  const ok = (v: string) => v === '' || Number.isFinite(Number(v));
  if ((!lo && !hi) || !ok(lo) || !ok(hi)) return '';
  return `${lo}..${hi}`;
}

export type ParsedExtValue =
  | { kind: 'in'; value: string }
  | { kind: 'contains'; value: string }
  | { kind: 'range'; min?: number; max?: number };

export function parseExtValue(raw: string): ParsedExtValue {
  const v = raw.trim();
  if (v.startsWith(SEARCH_PREFIX) && v.length > 1) {
    return { kind: 'contains', value: v.slice(1).trim() };
  }
  const range = v.match(RANGE_RE);
  if (range && (range[1] !== undefined || range[2] !== undefined)) {
    return {
      kind: 'range',
      ...(range[1] !== undefined ? { min: Number(range[1]) } : {}),
      ...(range[2] !== undefined ? { max: Number(range[2]) } : {}),
    };
  }
  return { kind: 'in', value: v };
}

/** The current range bounds in a field's values, for prefilling inputs. */
export function readExtRange(values: string[]): { min: string; max: string } {
  for (const raw of values) {
    const p = parseExtValue(raw);
    if (p.kind === 'range') {
      return {
        min: p.min !== undefined ? String(p.min) : '',
        max: p.max !== undefined ? String(p.max) : '',
      };
    }
  }
  return { min: '', max: '' };
}

/** The current search text in a field's values, for prefilling the input. */
export function readExtSearch(values: string[]): string {
  for (const raw of values) {
    const p = parseExtValue(raw);
    if (p.kind === 'contains') return p.value;
  }
  return '';
}

/** Label for an active-filter chip. */
export function formatExtValue(raw: string): string {
  const p = parseExtValue(raw);
  if (p.kind === 'contains') return `“${p.value}”`;
  if (p.kind === 'range') {
    if (p.min !== undefined && p.max !== undefined) return `${p.min} – ${p.max}`;
    if (p.min !== undefined) return `≥ ${p.min}`;
    return `≤ ${p.max}`;
  }
  return p.value;
}

function scalars(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/**
 * Whether a record passes one field's filter values. "Is one of" values are
 * OR-ed (any array element may match); search and range values must all hold.
 */
export function matchesExtFilter(
  record: Record<string, unknown>,
  key: string,
  values: string[]
): boolean {
  const field = extractNestedValue(record, key);
  const items = scalars(field);
  const parsed = values.map(parseExtValue);

  const oneOf = parsed.flatMap(p => (p.kind === 'in' && p.value ? [p.value.toLowerCase()] : []));
  if (oneOf.length > 0) {
    const hit = items.some(item => oneOf.includes(asText(item).trim().toLowerCase()));
    if (!hit) return false;
  }

  for (const p of parsed) {
    if (p.kind === 'contains') {
      const needle = p.value.toLowerCase();
      if (!items.some(item => asText(item).toLowerCase().includes(needle))) return false;
    } else if (p.kind === 'range') {
      const inRange = items.some(item => {
        const n = typeof item === 'number' ? item : Number(asText(item));
        if (!Number.isFinite(n)) return false;
        if (p.min !== undefined && n < p.min) return false;
        if (p.max !== undefined && n > p.max) return false;
        return true;
      });
      if (!inRange) return false;
    }
  }
  return true;
}
