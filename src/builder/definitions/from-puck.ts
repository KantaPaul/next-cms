/**
 * Block definitions for blocks still configured for Puck: label, fields,
 * defaults, slots, and nesting rules read from the Puck config, rendered with
 * the same components. Each block moves to `native.tsx` when it is ported.
 */

import type { BlockDefinition, FieldDef, SlotDef } from '@nextcms/builder-core';
import type { Config } from '@measured/puck';
import type { ComponentType } from 'react';
import { CONTENT, STYLE } from './fields';

/** The parts of a Puck field this file reads. */
type PuckField = {
  type?: string;
  label?: string;
  options?: { label: string; value: string | number | boolean }[];
  min?: number;
  max?: number;
  step?: number;
  allow?: string[];
  disallow?: string[];
  render?: unknown;
  arrayFields?: Record<string, PuckField>;
  objectFields?: Record<string, PuckField>;
  defaultItemProps?: Record<string, unknown>;
  getItemSummary?: (item: Record<string, unknown>, index?: number) => string;
};

/** Converts one Puck field; slots and unknown types return null. */
export function fieldFromPuck(name: string, field: PuckField, group?: string): FieldDef | null {
  const base = { label: field.label ?? name, group };
  switch (field.type) {
    case 'text':
    case 'textarea':
      return { ...base, type: field.type };
    case 'number':
      return { ...base, type: 'number', min: field.min, max: field.max, step: field.step };
    case 'select':
    case 'radio':
      return { ...base, type: field.type, options: field.options ?? [] };
    case 'custom':
      return { ...base, type: 'custom', render: field.render };
    case 'array': {
      const item = convertFields(field.arrayFields ?? {});
      return {
        ...base,
        type: 'list',
        item,
        defaultItem: field.defaultItemProps,
        itemLabel: field.getItemSummary
          ? (value, index) => field.getItemSummary?.(value, index) ?? `Item ${index + 1}`
          : undefined,
        min: field.min,
        max: field.max,
      };
    }
    case 'object':
      return { ...base, type: 'object', fields: convertFields(field.objectFields ?? {}) };
    default:
      return null;
  }
}

function convertFields(fields: Record<string, PuckField>, groupFor?: (name: string) => string) {
  const out: Record<string, FieldDef> = {};
  for (const [name, field] of Object.entries(fields)) {
    const converted = fieldFromPuck(name, field, groupFor?.(name));
    if (converted) out[name] = converted;
  }
  return out;
}

const rulesOf = (field: PuckField): SlotDef => ({ allow: field.allow, disallow: field.disallow });

export function definitionsFromPuck(
  config: Config,
  components: Record<string, ComponentType<Record<string, unknown>>>
): Record<string, BlockDefinition> {
  const categoryOf = new Map<string, string>();
  for (const [key, category] of Object.entries(config.categories ?? {})) {
    for (const type of category.components ?? []) categoryOf.set(String(type), key);
  }

  const definitions: Record<string, BlockDefinition> = {};
  for (const [type, component] of Object.entries(config.components)) {
    const fields = (component.fields ?? {}) as Record<string, PuckField>;
    const slots: Record<string, SlotDef> = {};
    const arraySlots: Record<string, Record<string, SlotDef>> = {};
    for (const [name, field] of Object.entries(fields)) {
      if (field.type === 'slot') slots[name] = rulesOf(field);
      for (const [key, inner] of Object.entries(field.arrayFields ?? {})) {
        if (inner.type === 'slot') arraySlots[name] = { ...arraySlots[name], [key]: rulesOf(inner) };
      }
    }
    const render = components[type];
    if (!render) continue;
    definitions[type] = {
      type,
      label: component.label ?? type,
      category: categoryOf.get(type),
      fields: convertFields(fields, name => (name === 'section' ? STYLE : CONTENT)),
      defaults: component.defaultProps as Record<string, unknown> | undefined,
      slots: Object.keys(slots).length ? slots : undefined,
      arraySlots: Object.keys(arraySlots).length ? arraySlots : undefined,
      render,
    };
  }
  return definitions;
}

/** Page settings fields from the Puck root config. */
export function rootFieldsFromPuck(config: Config): Record<string, FieldDef> {
  return convertFields((config.root?.fields ?? {}) as Record<string, PuckField>, () => 'Page');
}
