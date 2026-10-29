/**
 * Block definitions (R697, R773–R776). One definition per block holds its
 * type, editor metadata, props schema, fields, defaults, slots, loader, and
 * render component. Props are inferred from the Zod schema, so render,
 * defaults, and fields all type-check without hand-written prop types.
 */

import type { ComponentType } from 'react';
import type { z } from 'zod';
import type { BlockSchema, SlotRules } from './blocks';
import type { FieldDef, Fields } from './fields';
import type { BlockLoader, LoaderContext } from './loaders';

/** A named slot and the blocks it accepts (R776). */
export type SlotDef = SlotRules & { label?: string; min?: number; max?: number };

export function slot(rules: SlotDef = {}): SlotDef {
  return rules;
}

/** What a defaults function can use to pick values for where a block is dropped (R775). */
export type DefaultsContext = {
  siteId?: string;
  locale?: string;
  parentType?: string;
  theme?: Record<string, unknown>;
};

export type BlockMeta = {
  label: string;
  category?: string;
  /** Icon name or short text the host's insert panel understands. */
  icon?: string;
  keywords?: string[];
  thumbnail?: string;
  /** Props edited directly on the canvas (R696). */
  inlineProps?: string[];
  placeholder?: string;
};

export type BlockDefinition<P extends Record<string, unknown> = Record<string, unknown>> = BlockMeta & {
  type: string;
  /** Validates stored props and supplies their types and defaults. */
  schema?: z.ZodType<P>;
  fields?: Fields<P>;
  defaults?: Partial<P> | ((ctx: DefaultsContext) => Partial<P>);
  slots?: Record<string, SlotDef>;
  /** Slots inside each item of an array prop: `{ items: { content: slot() } }`. */
  arraySlots?: Record<string, Record<string, SlotDef>>;
  loader?: BlockLoader<LoaderContext>;
  render: ComponentType<P & { editing?: boolean }>;
};

type Shape = Record<string, z.ZodType>;

/**
 * Defines a block (R773). Props are inferred from `schema`, so `render`,
 * `defaults`, `fields`, and `when` conditions are checked against them here;
 * the result is a plain `BlockDefinition` that registries can hold together.
 */
export function defineBlock<S extends z.ZodObject<Shape>>(
  definition: Omit<BlockDefinition<z.infer<S> & Record<string, unknown>>, 'schema'> & { schema: S }
): BlockDefinition {
  return definition as unknown as BlockDefinition;
}

/* ---------- reading Zod schemas ---------- */

type ZodDef = {
  type: string;
  innerType?: z.ZodType;
  entries?: Record<string, string | number>;
};

const defOf = (schema: z.ZodType) => (schema as unknown as { def: ZodDef }).def;

function unwrap(schema: z.ZodType): z.ZodType {
  let current = schema;
  for (let def = defOf(current); def?.innerType; def = defOf(current)) {
    if (!['optional', 'default', 'nullable', 'prefault'].includes(def.type)) break;
    current = def.innerType;
  }
  return current;
}

function shapeOf(schema: z.ZodType | undefined): Shape {
  const inner = schema && unwrap(schema);
  return (inner as unknown as { shape?: Shape } | undefined)?.shape ?? {};
}

const startCase = (key: string) =>
  key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());

/** A sensible field for a Zod type: text, number, toggle, or select. */
export function fieldFromZod(key: string, schema: z.ZodType): FieldDef | null {
  const def = defOf(unwrap(schema));
  const label = startCase(key);
  switch (def?.type) {
    case 'string':
      return { type: 'text', label };
    case 'number':
      return { type: 'number', label };
    case 'boolean':
      return { type: 'toggle', label };
    case 'enum':
      return {
        type: 'select',
        label,
        options: Object.values(def.entries ?? {}).map(value => ({ label: startCase(String(value)), value })),
      };
    default:
      return null;
  }
}

/** Every prop's default from the schema (`.default()` values). */
export function schemaDefaults(schema: z.ZodType | undefined): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(shapeOf(schema))) {
    const parsed = prop.safeParse(undefined);
    if (parsed.success && parsed.data !== undefined) defaults[key] = parsed.data;
  }
  return defaults;
}

/** The block's default props for a context: schema defaults, then `defaults`. */
export function defaultProps(
  definition: BlockDefinition,
  ctx: DefaultsContext = {}
): Record<string, unknown> {
  const extra = typeof definition.defaults === 'function' ? definition.defaults(ctx) : definition.defaults;
  return { ...schemaDefaults(definition.schema), ...extra };
}

/** Fields to show: the explicit ones, plus generated ones for schema props without a field. */
export function fieldsOf(definition: BlockDefinition): Record<string, FieldDef> {
  const fields: Record<string, FieldDef> = {};
  const slotKeys = new Set([
    ...Object.keys(definition.slots ?? {}),
    ...Object.keys(definition.arraySlots ?? {}).flatMap(array => Object.keys(definition.arraySlots?.[array] ?? {})),
  ]);
  for (const [key, prop] of Object.entries(shapeOf(definition.schema))) {
    if (slotKeys.has(key) || definition.fields?.[key]) continue;
    const field = fieldFromZod(key, prop);
    if (field) fields[key] = field;
  }
  return { ...(definition.fields as Record<string, FieldDef> | undefined), ...fields };
}

/** The editor's view of a block: defaults, slots, and nesting rules. */
export function toBlockSchema(definition: BlockDefinition, ctx?: DefaultsContext): BlockSchema {
  return {
    type: definition.type,
    label: definition.label,
    defaultProps: defaultProps(definition, ctx),
    slots: definition.slots,
    arraySlots: definition.arraySlots,
  };
}

/** Checks props against the block's schema; blocks without a schema always pass. */
export function validateProps(
  definition: BlockDefinition,
  props: Record<string, unknown>
): { ok: true } | { ok: false; issues: string[] } {
  if (!definition.schema) return { ok: true };
  const result = definition.schema.safeParse(props);
  if (result.success) return { ok: true };
  return {
    ok: false,
    issues: result.error.issues.map(issue => `${issue.path.join('.') || 'props'}: ${issue.message}`),
  };
}
