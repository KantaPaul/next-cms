/**
 * Schema helpers (R778 / EXT-06) that wrap any field type: `responsive()` for
 * per-device values, `token()` for design tokens, `dynamic()` for data
 * bindings, and `translatable()` for per-locale text. Also the R782 / EXT-10
 * escape hatches: allowlisted class names and data attributes, validated
 * against a fixed list rather than accepting raw CSS or arbitrary HTML
 * attributes.
 *
 * Each helper returns an ordinary Zod schema (so `defineBlock` validates and
 * infers types exactly as it does for any other field) plus registers the
 * wrapper's own metadata in a side `WeakMap`, so `fieldFromZod` can recognize
 * the wrapper and generate the right inspector field without mutating the
 * schema object itself.
 */

import { z } from 'zod';
import { DEVICES } from './fields';

/* ---------- responsive() ---------- */

const responsiveRegistry = new WeakMap<z.ZodType, z.ZodType>();

/**
 * A value that may be a single value or set per device, with the same
 * fallback as the R694 inspector fields: `responsive(z.number())` validates
 * either a plain number or `{ desktop?, tablet?, mobile? }`.
 */
export function responsive<T extends z.ZodType>(inner: T): z.ZodType {
  const perDevice = z.object(
    Object.fromEntries(DEVICES.map(device => [device, inner.optional()]))
  );
  const schema = z.union([inner, perDevice]);
  responsiveRegistry.set(schema, inner);
  return schema;
}

/** The schema a `responsive()` wrapper validates each device's value against, if `schema` is one. */
export function responsiveInner(schema: z.ZodType): z.ZodType | undefined {
  return responsiveRegistry.get(schema);
}

/* ---------- token() ---------- */

const tokenRegistry = new WeakMap<z.ZodType, string>();

/**
 * A design-token reference: a string naming a token of `kind` (for example
 * `token('color')`, `token('spacing')`) rather than a raw value. The actual
 * token list is the host's theme, supplied to the inspector's token picker
 * (R723) separately — this only marks the prop as token-shaped so a field is
 * generated for it.
 */
export function token(kind: string): z.ZodType {
  const schema = z.string();
  tokenRegistry.set(schema, kind);
  return schema;
}

/** The token kind `schema` was declared with via `token()`, if any. */
export function tokenKind(schema: z.ZodType): string | undefined {
  return tokenRegistry.get(schema);
}

/* ---------- dynamic() ---------- */

const dynamicRegistry = new WeakMap<z.ZodType, z.ZodType>();

/** A binding to a dynamic data source instead of a literal value. */
export type DynamicBinding = { $dynamic: string; path?: string };

const dynamicBindingSchema = z.object({
  $dynamic: z.string(),
  path: z.string().optional(),
});

/**
 * A value that may be a literal (validated by `inner`) or bound to dynamic
 * data: `dynamic(z.string())` validates either a plain string or
 * `{ $dynamic: 'source', path?: 'field' }`.
 */
export function dynamic<T extends z.ZodType>(inner: T): z.ZodType {
  const schema = z.union([inner, dynamicBindingSchema]);
  dynamicRegistry.set(schema, inner);
  return schema;
}

/** The schema a `dynamic()` wrapper validates the literal branch against, if `schema` is one. */
export function dynamicInner(schema: z.ZodType): z.ZodType | undefined {
  return dynamicRegistry.get(schema);
}

/** Whether a stored value is a dynamic binding rather than a literal. */
export function isDynamicValue(value: unknown): value is DynamicBinding {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).$dynamic === 'string'
  );
}

/* ---------- translatable() ---------- */

const translatableRegistry = new WeakMap<z.ZodType, z.ZodType>();

/**
 * Per-locale text: a plain value (the authoring locale) or a map of locale
 * code to value, for example `translatable(z.string())` validates either a
 * string or `{ en: 'Hello', fr: 'Bonjour' }`.
 */
export function translatable<T extends z.ZodType>(
  inner: T = z.string() as unknown as T
): z.ZodType {
  const perLocale = z.record(z.string(), inner.optional());
  const schema = z.union([inner, perLocale]);
  translatableRegistry.set(schema, inner);
  return schema;
}

/** The schema a `translatable()` wrapper validates each locale's value against, if `schema` is one. */
export function translatableInner(schema: z.ZodType): z.ZodType | undefined {
  return translatableRegistry.get(schema);
}

/** The value for `locale`, falling back to `fallback` (default `'en'`) when that locale is unset. */
export function translatableValue<T>(
  value: T | Record<string, T> | undefined,
  locale: string,
  fallback = 'en'
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return value as T;
  const map = value as Record<string, T>;
  return map[locale] ?? map[fallback];
}

/* ---------- escape hatches (R782 / EXT-10) ---------- */

const classListRegistry = new WeakMap<z.ZodType, string[]>();

/**
 * An allowlisted set of class names: stored as an array of the chosen
 * classes, each one validated against `allowed`. Never accepts arbitrary
 * class strings or raw CSS.
 */
export function allowedClasses(allowed: string[]): z.ZodType {
  const schema = z.array(z.enum(allowed as [string, ...string[]]));
  classListRegistry.set(schema, allowed);
  return schema;
}

/** The allowlist `schema` validates against, if it came from `allowedClasses()`. */
export function allowedClassList(schema: z.ZodType): string[] | undefined {
  return classListRegistry.get(schema);
}

/**
 * A constrained set of `data-*` attributes: only the keys in `allowed` may
 * be set, and every value is a plain string. Never accepts arbitrary
 * attribute names or non-string values.
 */
export function dataAttributes(allowed: string[]): z.ZodType {
  return z.object(
    Object.fromEntries(allowed.map(key => [key, z.string().optional()]))
  );
}
