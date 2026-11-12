/**
 * Block definitions (R697, R773–R776). One definition per block holds its
 * type, editor metadata, props schema, fields, defaults, slots, loader, and
 * render component. Props are inferred from the Zod schema, so render,
 * defaults, and fields all type-check without hand-written prop types.
 */

import type { ComponentType } from 'react';
import { z } from 'zod';
import type { BlockInfo, BlockReorder, BlockSchema, SlotRules } from './blocks';
import type { FieldDef, Fields } from './fields';
import type { InspectorTabDef } from './inspector-layout';
import type { BlockLoader, LoaderContext } from './loaders';
import { isDynamicBinding } from './dynamic';
import {
  allowedClassList,
  dynamicInner,
  responsiveInner,
  tokenKind,
  translatableInner,
} from './schema-helpers';
import type { PropTrait } from './traits';

/** A named slot and the blocks it accepts (R776). */
export type SlotDef = SlotRules & {
  label?: string;
  min?: number;
  max?: number;
};

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

export type BlockMeta = BlockInfo & {
  label: string;
  keywords?: string[];
  thumbnail?: string;
  /** Props edited directly on the canvas (R696). */
  inlineProps?: string[];
  placeholder?: string;
  /** Parts the user may reorder; omit to disable reordering. */
  reorder?: BlockReorder;
};

/**
 * Pure helper that resolves a saved part order against a widget's default part ids:
 * keeps only known ids (deduplicated) and appends any missing default ids in their default order.
 */
export function reorderParts(
  order: readonly string[] | undefined | null,
  defaultIds: readonly string[]
): string[] {
  if (!order || !Array.isArray(order) || order.length === 0) {
    return [...defaultIds];
  }
  const knownSet = new Set(defaultIds);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of order) {
    if (typeof id === 'string' && knownSet.has(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  for (const id of defaultIds) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

export type BlockDefinition<
  P extends Record<string, unknown> = Record<string, unknown>,
> = BlockMeta & {
  type: string;
  /** Validates stored props and supplies their types and defaults. */
  schema?: z.ZodType<P>;
  fields?: Fields<P>;
  defaults?: Partial<P> | ((ctx: DefaultsContext) => Partial<P>);
  slots?: Record<string, SlotDef>;
  /** Slots inside each item of an array prop: `{ items: { content: slot() } }`. */
  arraySlots?: Record<string, Record<string, SlotDef>>;
  loader?: BlockLoader<LoaderContext>;
  /** Opt-in prop groups that add props, fields, defaults, and render behaviour (R777). */
  traits?: PropTrait<P>[];
  /** Named prop sets shown in the insert panel alongside the plain block (R781). */
  presets?: Record<string, Partial<P>>;
  /** Custom inspector tabs for this block. */
  tabs?: InspectorTabDef[];
  render: ComponentType<P & { editing?: boolean }>;
};

export type Shape = Record<string, z.ZodType>;

/** The schema a block validates and defaults against: its own schema plus opted-in traits (R777). */
function effectiveSchema<P extends Record<string, unknown>>(
  definition: BlockDefinition<P>
): z.ZodType | undefined {
  const traits = definition.traits ?? [];
  const reorderProp = definition.reorder
    ? (definition.reorder.prop ?? 'partOrder')
    : null;
  const baseShape = shapeOf(definition.schema);
  const needsReorderProp =
    reorderProp !== null &&
    definition.schema !== undefined &&
    !(reorderProp in baseShape);
  if (traits.length === 0 && !needsReorderProp) return definition.schema;
  const shape: Record<string, z.ZodType> = { ...baseShape };
  for (const trait of traits) {
    const traitShape = trait.schema ? shapeOf(trait.schema) : {};
    for (const [key, prop] of Object.entries(traitShape)) {
      shape[key] = prop;
    }
  }
  if (reorderProp && !(reorderProp in shape)) {
    shape[reorderProp] = z.array(z.string()).optional();
  }
  return z.object(shape);
}

/**
 * Defines a block (R773). Props are inferred from `schema`, so `render`,
 * `defaults`, `fields`, and `when` conditions are checked against them here;
 * the result is a plain `BlockDefinition` that registries can hold together.
 */
export function defineBlock<
  S extends z.ZodObject<Shape>,
  P extends Record<string, unknown> = z.infer<S> & Record<string, unknown>,
>(
  definition: Omit<
    BlockDefinition<NoInfer<P>>,
    'schema' | 'render'
  > & {
    schema: S;
    render: ComponentType<P & { editing?: boolean }>;
  }
): BlockDefinition;
export function defineBlock(
  definition: BlockMeta & {
    type: string;
    schema?: z.ZodType<any>;
    fields?: Fields<any>;
    defaults?: any;
    slots?: Record<string, SlotDef>;
    arraySlots?: Record<string, Record<string, SlotDef>>;
    loader?: BlockLoader<LoaderContext>;
    traits?: PropTrait<any>[];
    presets?: Record<string, any>;
    tabs?: InspectorTabDef[];
    render: ComponentType<any>;
  }
): BlockDefinition;
export function defineBlock(
  definition: any
): BlockDefinition {
  if (definition.reorder && definition.schema) {
    const prop = definition.reorder.prop ?? 'partOrder';
    const baseShape = shapeOf(definition.schema);
    if (!(prop in baseShape)) {
      const extended = (definition.schema as z.ZodObject<Shape>).extend({
        [prop]: z.array(z.string()).optional(),
      });
      return {
        ...definition,
        schema: extended,
      } as unknown as BlockDefinition;
    }
  }
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
    if (!['optional', 'default', 'nullable', 'prefault'].includes(def.type))
      break;
    current = def.innerType;
  }
  return current;
}

export function shapeOf(schema: z.ZodType | undefined): Shape {
  const inner = schema && unwrap(schema);
  return (inner as unknown as { shape?: Shape } | undefined)?.shape ?? {};
}

const startCase = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());

/** A sensible field for a Zod type: text, number, toggle, select, or one from a schema helper (R778, R782). */
export function fieldFromZod(key: string, schema: z.ZodType): FieldDef | null {
  const plain = unwrap(schema);
  const responsiveOf = responsiveInner(plain);
  if (responsiveOf) {
    const inner = fieldFromZod(key, responsiveOf);
    return inner ? { ...inner, responsive: true } : null;
  }
  const dynamicOf = dynamicInner(plain);
  if (dynamicOf) {
    const inner = fieldFromZod(key, dynamicOf);
    return inner ? { ...inner, dynamic: true } : null;
  }
  const translatableOf = translatableInner(plain);
  if (translatableOf) {
    const inner = fieldFromZod(key, translatableOf);
    return inner ? { ...inner, translatable: true } : null;
  }
  const classes = allowedClassList(plain);
  if (classes) {
    return {
      type: 'class-list',
      label: startCase(key),
      options: classes.map(value => ({ label: value, value })),
    };
  }
  const kind = tokenKind(plain);
  if (kind) {
    return kind === 'color'
      ? { type: 'color', label: startCase(key), visual: true, tokens: [] }
      : { type: 'text', label: startCase(key), unit: kind };
  }
  const def = defOf(plain);
  const label = startCase(key);
  const description =
    (plain as { description?: string }).description ||
    (def as { description?: string } | undefined)?.description;
  const withMeta = (f: FieldDef): FieldDef => {
    if (description && !f.description) return { ...f, description };
    return f;
  };

  switch (def?.type) {
    case 'string':
      return withMeta({ type: 'text', label });
    case 'number':
      return withMeta({ type: 'number', label });
    case 'boolean':
      return withMeta({ type: 'toggle', label });
    case 'enum':
      return withMeta({
        type: 'select',
        label,
        options: Object.values(def.entries ?? {}).map(value => ({
          label: startCase(String(value)),
          value,
        })),
      });
    case 'union': {
      const options = (def as { options?: z.ZodType[] }).options ?? [];
      const isLiteralUnion =
        options.length > 0 &&
        options.every(opt => {
          const d = defOf(opt);
          return d?.type === 'literal' || (opt as { type?: string }).type === 'literal';
        });
      if (isLiteralUnion) {
        const literalValues: (string | number | boolean)[] = options.map(opt => {
          const d = defOf(opt) as { values?: unknown } | undefined;
          if (Array.isArray(d?.values)) return d.values[0] as string | number | boolean;
          if (d?.values instanceof Set) return Array.from(d.values)[0] as string | number | boolean;
          const optRaw = opt as unknown as { values?: Set<unknown>; value?: unknown };
          if (optRaw.values instanceof Set)
            return Array.from(optRaw.values)[0] as string | number | boolean;
          return (optRaw.value ?? '') as string | number | boolean;
        });
        return withMeta({
          type: 'select',
          label,
          options: literalValues.map(v => ({
            label: startCase(String(v)),
            value: v,
          })),
        });
      }
      return null;
    }
    default:
      return null;
  }
}

/** Every prop's default from the schema (`.default()` values). */
export function schemaDefaults(
  schema: z.ZodType | undefined
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(shapeOf(schema))) {
    const parsed = prop.safeParse(undefined);
    if (parsed.success && parsed.data !== undefined)
      defaults[key] = parsed.data;
  }
  return defaults;
}

/** The block's default props for a context: trait defaults, schema defaults, then `defaults`. */
export function defaultProps(
  definition: BlockDefinition,
  ctx: DefaultsContext = {}
): Record<string, unknown> {
  const schema = effectiveSchema(definition);
  const fromSchema = schema ? schemaDefaults(schema) : {};
  const fromTraits = (definition.traits ?? []).flatMap(trait => {
    const d =
      typeof trait.defaults === 'function'
        ? trait.defaults(ctx)
        : trait.defaults;
    return d ? [d] : [];
  });
  const extra =
    typeof definition.defaults === 'function'
      ? definition.defaults(ctx)
      : definition.defaults;
  return Object.assign({}, fromSchema, ...fromTraits, extra);
}

/** Fields to show: the explicit ones, plus generated ones for schema props without a field. */
export function fieldsOf(
  definition: BlockDefinition
): Record<string, FieldDef> {
  const fields: Record<string, FieldDef> = {};
  const slotKeys = new Set([
    ...Object.keys(definition.slots ?? {}),
    ...Object.keys(definition.arraySlots ?? {}).flatMap(array =>
      Object.keys(definition.arraySlots?.[array] ?? {})
    ),
  ]);
  const explicitRoots = new Set<string>();
  for (const field of Object.values(definition.fields ?? {})) {
    if (field && typeof field === 'object' && (field as FieldDef).path) {
      const rootKey = (field as FieldDef).path!.split('.')[0];
      if (rootKey) explicitRoots.add(rootKey);
    }
  }
  for (const [key, prop] of Object.entries(shapeOf(definition.schema))) {
    if (slotKeys.has(key) || definition.fields?.[key] || explicitRoots.has(key)) continue;
    const field = fieldFromZod(key, prop);
    if (field) fields[key] = field;
  }
  const merged = {
    ...(definition.fields as Record<string, FieldDef> | undefined),
    ...fields,
  };
  for (const trait of definition.traits ?? []) {
    if (trait.fields) Object.assign(merged, trait.fields);
  }
  return merged;
}

/** The editor's view of a block: defaults, slots, and nesting rules. */
export function toBlockSchema(
  definition: BlockDefinition,
  ctx?: DefaultsContext
): BlockSchema {
  const base = defaultProps(definition, ctx);
  const presets = definition.presets
    ? Object.fromEntries(
        Object.entries(definition.presets).map(([name, props]) => [
          name,
          { ...base, ...props },
        ])
      )
    : undefined;
  const info: BlockInfo = {};
  for (const key of INFO_KEYS) {
    if (definition[key] !== undefined) Object.assign(info, { [key]: definition[key] });
  }
  return {
    type: definition.type,
    label: definition.label,
    ...info,
    defaultProps: base,
    fields: fieldsOf(definition),
    presets,
    slots: definition.slots,
    arraySlots: definition.arraySlots,
  };
}

const INFO_KEYS = [
  'category',
  'icon',
  'description',
  'capabilities',
  'semanticTag',
  'nesting',
  'defaultSize',
  'parents',
  'reorder',
] as const satisfies readonly (keyof BlockInfo)[];

function valueAtIssuePath(
  root: Record<string, unknown>,
  path: readonly PropertyKey[]
): unknown {
  let cur: unknown = root;
  for (const key of path) {
    if (typeof key === 'symbol' || cur == null || typeof cur !== 'object') {
      return undefined;
    }
    cur = (cur as Record<PropertyKey, unknown>)[key];
  }
  return cur;
}

/** Checks props against the block's schema, including opted-in traits (R777); blocks without a schema always pass. */
export function validateProps(
  definition: BlockDefinition,
  props: Record<string, unknown>
): { ok: true } | { ok: false; issues: string[] } {
  const schema = effectiveSchema(definition);
  if (!schema) return { ok: true };
  const result = schema.safeParse(props);
  if (result.success) return { ok: true };
  const remaining = result.error.issues.filter(issue => {
    if (issue.path.length === 0) return true;
    const val = valueAtIssuePath(props, issue.path);
    return !(
      isDynamicBinding(val) &&
      typeof val.$dynamic === 'string' &&
      val.$dynamic.length > 0
    );
  });
  if (remaining.length === 0) return { ok: true };
  return {
    ok: false,
    issues: remaining.map(
      issue => `${issue.path.join('.') || 'props'}: ${issue.message}`
    ),
  };
}
