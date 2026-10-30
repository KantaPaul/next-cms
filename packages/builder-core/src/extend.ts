/**
 * Extending blocks without forking them: `extendBlock` customizes one block
 * (R779 / EXT-07), and `applyBlockPlugins` extends every block at once from
 * an ordered list of plugins (R780 / EXT-08).
 */

import type { ComponentType, ReactNode } from 'react';
import { z } from 'zod';
import type { BlockDefinition, DefaultsContext, Shape } from './define';
import { shapeOf } from './define';
import type { FieldDef, Fields } from './fields';

export type ExtendBlockOptions<
  P extends Record<string, unknown>,
  Extra extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** A new type name and/or label for the extended block; omit to keep the base's. */
  type?: string;
  label?: string;
  fields?: {
    /** Extra schema props, validated and inferred like any other prop. */
    add?: Record<string, z.ZodType>;
    /** Prop names to drop from the schema and inspector. */
    hide?: (keyof P | string)[];
  };
  defaults?:
    | Partial<P & Extra>
    | ((ctx: DefaultsContext) => Partial<P & Extra>);
  /** Presets added on top of the base block's own presets, by name. */
  presets?: Record<string, Partial<P & Extra>>;
  /** Wraps or replaces the base block's render; `Base` is the original render. */
  render?: (
    props: (P & Extra) & { editing?: boolean },
    Base: ComponentType<P & { editing?: boolean }>
  ) => ReactNode;
};

/**
 * Customizes an existing block (built-in or third party) without forking it:
 * add or hide fields, change defaults, add presets, and wrap or replace
 * render while receiving the original as `Base` (R779 / EXT-07).
 */
export function extendBlock<
  P extends Record<string, unknown>,
  Extra extends Record<string, unknown> = Record<string, unknown>,
>(
  base: BlockDefinition<P>,
  options: ExtendBlockOptions<P, Extra> = {}
): BlockDefinition {
  const hidden = new Set((options.fields?.hide ?? []).map(String));
  const added = options.fields?.add ?? {};
  const baseShape = shapeOf(base.schema as z.ZodType | undefined);
  const shape: Shape = { ...baseShape, ...added };
  for (const key of hidden) delete shape[key];
  const schema =
    base.schema || Object.keys(added).length
      ? (z.object(shape) as unknown as z.ZodType<P & Extra>)
      : undefined;

  const fields = base.fields
    ? (Object.fromEntries(
        Object.entries(base.fields as Record<string, FieldDef>).filter(
          ([key]) => !hidden.has(key)
        )
      ) as Fields<P & Extra>)
    : undefined;

  const Base = base.render as unknown as ComponentType<
    P & { editing?: boolean }
  >;
  const render = options.render
    ? (props: (P & Extra) & { editing?: boolean }) =>
        options.render?.(props, Base)
    : (base.render as unknown as ComponentType<
        (P & Extra) & { editing?: boolean }
      >);

  return {
    ...base,
    type: options.type ?? base.type,
    label: options.label ?? base.label,
    schema,
    fields,
    defaults: (options.defaults ?? base.defaults) as BlockDefinition<
      P & Extra
    >['defaults'],
    presets: options.presets
      ? {
          ...(base.presets as Record<string, Partial<P & Extra>> | undefined),
          ...options.presets,
        }
      : (base.presets as Record<string, Partial<P & Extra>> | undefined),
    render: render as ComponentType<(P & Extra) & { editing?: boolean }>,
  } as unknown as BlockDefinition;
}

export type BlockPlugin = {
  /** Stable name used in logs and dev warnings. */
  name: string;
  /** Transforms one block definition; return it unchanged to leave a block alone. */
  extend: (definition: BlockDefinition) => BlockDefinition;
};

/**
 * Applies every plugin's `extend` to every block, plugin by plugin in array
 * order, so a later plugin sees the props and render an earlier plugin added
 * (R780 / EXT-08). Typically used for something every block should get, such
 * as a tracking id or test id prop.
 */
export function applyBlockPlugins(
  definitions: BlockDefinition[],
  plugins: BlockPlugin[]
): BlockDefinition[] {
  return definitions.map(definition =>
    plugins.reduce((current, plugin) => plugin.extend(current), definition)
  );
}
