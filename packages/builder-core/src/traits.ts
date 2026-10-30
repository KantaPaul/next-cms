/**
 * Prop traits (R777): reusable prop groups that any block opts into with
 * `traits: [...]`. Each trait brings its own schema fragment, inspector
 * fields, defaults, and render wrapper, so blocks compose behaviour without
 * forking. Traits only add optional props; the block keeps ownership of its
 * core props.
 */

import type { ComponentType } from 'react';
import type { z } from 'zod';
import type { BlockDefinition, DefaultsContext } from './define';
import type { FieldDef } from './fields';

export type BlockRender<P extends Record<string, unknown> = Record<string, unknown>> = ComponentType<P & { editing?: boolean }>;

export type PropTrait<P extends Record<string, unknown> = Record<string, unknown>> = {
  /** Stable trait name used in logs, metadata, and editor surfaces. */
  name: string;
  /** Optional schema fragment the trait adds to the block's props. */
  schema?: z.ZodType;
  /** Inspector fields the trait contributes. */
  fields?: Record<string, FieldDef<P>>;
  /** Defaults the trait contributes; a value or a function of context (R775). */
  defaults?: Record<string, unknown> | ((ctx: DefaultsContext) => Record<string, unknown>);
  /** Wraps the block render, for behaviour that has to wrap the rendered element. */
  wrap?: (base: BlockRender<P>) => BlockRender<P>;
};

const makeTrait = (
  name: string,
  schema: z.ZodType | undefined,
  fields: Record<string, FieldDef> | undefined,
  defaults: Record<string, unknown> | undefined,
  wrap?: (base: BlockRender) => BlockRender
): PropTrait => ({ name, schema, fields, defaults, wrap });

/** Style props a block opts into: spacing tokens as strings and gap as a number. */
export const withStyle = (): PropTrait =>
  makeTrait(
    'style',
    z.object({
      style: z.object({
        padding: z.string().optional(),
        margin: z.string().optional(),
        gap: z.number().optional(),
      }).optional(),
    }),
    {
      style: {
        type: 'object',
        group: 'Style',
        fields: {
          padding: { type: 'text', label: 'Padding', unit: 'px' },
          margin: { type: 'text', label: 'Margin', unit: 'px' },
          gap: { type: 'number', label: 'Gap', unit: 'px' },
        },
      },
    },
    { style: {} }
  );

/** Layout props a block opts into: direction, gap, and alignment tracks. */
export const withLayout = (): PropTrait =>
  makeTrait(
    'layout',
    z.object({
      layout: z.object({
        direction: z.enum(['row', 'column']).optional(),
        gap: z.number().optional(),
        align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
        justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
      }).optional(),
    }),
    {
      layout: {
        type: 'object',
        group: 'Layout',
        fields: {
          direction: {
            type: 'select',
            label: 'Direction',
            options: [
              { label: 'Row', value: 'row' },
              { label: 'Column', value: 'column' },
            ],
          },
          gap: { type: 'number', label: 'Gap', unit: 'px' },
          align: {
            type: 'select',
            label: 'Align',
            options: [
              { label: 'Start', value: 'start' },
              { label: 'Center', value: 'center' },
              { label: 'End', value: 'end' },
              { label: 'Stretch', value: 'stretch' },
            ],
          },
          justify: {
            type: 'select',
            label: 'Justify',
            options: [
              { label: 'Start', value: 'start' },
              { label: 'Center', value: 'center' },
              { label: 'End', value: 'end' },
              { label: 'Between', value: 'between' },
              { label: 'Around', value: 'around' },
              { label: 'Evenly', value: 'evenly' },
            ],
          },
        },
      },
    },
    { layout: {} }
  );

/** Motion props a block opts into: an animation preset and duration. */
export const withAnimation = (): PropTrait =>
  makeTrait(
    'animation',
    z.object({
      animation: z.object({
        preset: z.string().optional(),
        duration: z.number().optional(),
      }).optional(),
    }),
    {
      animation: {
        type: 'object',
        group: 'Motion',
        fields: {
          preset: { type: 'text', label: 'Preset' },
          duration: { type: 'number', label: 'Duration', unit: 'ms' },
        },
      },
    },
    { animation: {} }
  );

/** Visibility props a block opts into: hidden and hide-on-mobile flags. */
export const withVisibility = (): PropTrait =>
  makeTrait(
    'visibility',
    z.object({
      visibility: z.object({
        hidden: z.boolean().optional(),
        hideOnMobile: z.boolean().optional(),
      }).optional(),
    }),
    {
      visibility: {
        type: 'object',
        group: 'Visibility',
        fields: {
          hidden: { type: 'toggle', label: 'Hidden' },
          hideOnMobile: { type: 'toggle', label: 'Hide on mobile' },
        },
      },
    },
    { visibility: {} }
  );

/** Data props a block opts into: the dynamic data source it reads. */
export const withDynamic = (): PropTrait =>
  makeTrait(
    'dynamic',
    z.object({
      dynamic: z.object({
        source: z.string().optional(),
      }).optional(),
    }),
    {
      dynamic: {
        type: 'object',
        group: 'Data',
        fields: {
          source: { type: 'text', label: 'Data source' },
        },
      },
    },
    { dynamic: {} }
  );

/** Accessibility props a block opts into: skip-link behaviour. */
export const withA11y = (): PropTrait =>
  makeTrait(
    'a11y',
    z.object({
      a11y: z.object({
        skipLink: z.boolean().optional(),
      }).optional(),
    }),
    {
      a11y: {
        type: 'object',
        group: 'Accessibility',
        fields: {
          skipLink: { type: 'toggle', label: 'Add skip link' },
        },
      },
    },
    { a11y: {} }
  );

/** Applies trait render wrappers in order over the block's own render (R777). */
export function composeRender<P extends Record<string, unknown>>(
  definition: BlockDefinition<P>,
  traits: PropTrait<P>[]
): BlockRender<P> {
  let render = definition.render;
  for (const trait of traits) {
    if (trait.wrap) render = trait.wrap(render);
  }
  return render;
}
