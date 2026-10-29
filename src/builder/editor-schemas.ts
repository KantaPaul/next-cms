/**
 * Block schemas for the new editor, derived from the Puck config so both
 * editors share defaults, slots, and nesting rules during the move off Puck.
 * Replaced by per-block definitions in B4 (R697, R773).
 */

import type { BlockSchema, BlockSchemas, SlotRules } from '@nextcms/builder-core';
import type { BlockGroup } from '@nextcms/builder-react';
import type { Config } from '@measured/puck';
import { builderConfig } from './config';

/** The parts of a Puck field this file reads. */
type FieldShape = {
  type?: string;
  allow?: string[];
  disallow?: string[];
  arrayFields?: Record<string, FieldShape>;
};

const rules = (field: FieldShape): SlotRules => ({
  allow: field.allow,
  disallow: field.disallow,
});

export function schemasFromConfig(config: Config): BlockSchemas {
  const schemas: BlockSchemas = {};
  for (const [type, component] of Object.entries(config.components)) {
    const schema: BlockSchema = {
      type,
      label: component.label ?? type,
      defaultProps: component.defaultProps as Record<string, unknown> | undefined,
    };
    const fields = (component.fields ?? {}) as Record<string, FieldShape>;
    for (const [name, field] of Object.entries(fields)) {
      if (field.type === 'slot') {
        schema.slots = { ...schema.slots, [name]: rules(field) };
      } else if (field.type === 'array') {
        for (const [key, inner] of Object.entries(field.arrayFields ?? {})) {
          if (inner.type !== 'slot') continue;
          schema.arraySlots = {
            ...schema.arraySlots,
            [name]: { ...schema.arraySlots?.[name], [key]: rules(inner) },
          };
        }
      }
    }
    schemas[type] = schema;
  }
  return schemas;
}

export function groupsFromConfig(config: Config): BlockGroup[] {
  return Object.values(config.categories ?? {}).map(category => ({
    title: category.title ?? '',
    types: (category.components ?? []).map(String),
  }));
}

export const pageSchemas = schemasFromConfig(builderConfig);
export const pageBlockGroups = groupsFromConfig(builderConfig);
