import assert from 'node:assert';
import { describe, it } from 'node:test';
import { z } from 'zod';
import {
  defaultProps,
  defineBlock,
  fieldsOf,
  slot,
  toBlockSchema,
  validateProps,
} from '../define';
import {
  inheritedFrom,
  resetDeviceValue,
  valueForDevice,
  withDeviceValue,
} from '../fields';
import { allowedClasses, responsive, token } from '../schema-helpers';

const Card = defineBlock({
  type: 'Card',
  label: 'Card',
  category: 'Marketing',
  keywords: ['pricing'],
  schema: z.object({
    title: z.string().default('Pro'),
    price: z.number().min(0).default(29),
    featured: z.boolean().default(false),
    tone: z.enum(['light', 'dark']).default('light'),
    note: z.string().optional(),
  }),
  fields: { title: { type: 'textarea', label: 'Heading', group: 'Content' } },
  defaults: ctx => (ctx.locale === 'fr' ? { title: 'Pro (FR)' } : {}),
  slots: { body: slot({ allow: ['Text'], max: 4 }) },
  // Props are inferred: `price` is a number here.
  render: ({ title, price }) => `${title} ${price.toFixed(2)}` as never,
});

describe('defineBlock', () => {
  it('takes defaults from the schema and the defaults function', () => {
    assert.deepEqual(defaultProps(Card), {
      title: 'Pro',
      price: 29,
      featured: false,
      tone: 'light',
    });
    assert.equal(defaultProps(Card, { locale: 'fr' }).title, 'Pro (FR)');
  });

  it('keeps explicit fields and generates the rest from the schema', () => {
    const fields = fieldsOf(Card);
    assert.equal(fields.title.type, 'textarea');
    assert.equal(fields.price.type, 'number');
    assert.equal(fields.featured.type, 'toggle');
    assert.deepEqual(
      fields.tone.type === 'select' && fields.tone.options.map(o => o.value),
      ['light', 'dark']
    );
    assert.equal(fields.note.type, 'text');
  });

  it('gives the editor defaults, slots, and rules', () => {
    const schema = toBlockSchema(Card);
    assert.deepEqual(schema.slots, { body: { allow: ['Text'], max: 4 } });
    assert.equal(schema.defaultProps?.price, 29);
  });

  it('validates stored props', () => {
    assert.deepEqual(validateProps(Card, { price: 5 }), { ok: true });
    const bad = validateProps(Card, { price: -1 });
    assert.equal(bad.ok, false);
  });
});

const Banner = defineBlock({
  type: 'Banner',
  label: 'Banner',
  schema: z.object({
    columns: responsive(z.number().int().min(1).max(4)).default(1),
    accent: token('color').default('primary'),
    size: allowedClasses(['sm', 'md', 'lg']).default([]),
  }),
  presets: { Wide: { columns: 4 } },
  render: () => null as never,
});

describe('schema helpers wired into field generation (R778, R782)', () => {
  it('generates a responsive field from a responsive() prop', () => {
    const field = fieldsOf(Banner).columns;
    assert.equal(field.type, 'number');
    assert.equal(field.responsive, true);
  });

  it("generates a visual color field with an empty token list from token('color')", () => {
    const field = fieldsOf(Banner).accent as {
      type: string;
      visual?: boolean;
      tokens?: unknown[];
    };
    assert.equal(field.type, 'color');
    assert.equal(field.visual, true);
    assert.deepEqual(field.tokens, []);
  });

  it('generates a class-list field with the allowlist as options', () => {
    const field = fieldsOf(Banner).size as {
      type: string;
      options?: { value: string }[];
    };
    assert.equal(field.type, 'class-list');
    assert.deepEqual(
      field.options?.map(o => o.value),
      ['sm', 'md', 'lg']
    );
  });

  it('validates responsive, token, and class-list props', () => {
    assert.equal(
      validateProps(Banner, {
        columns: { desktop: 3, mobile: 1 },
        accent: 'accent',
        size: ['sm', 'lg'],
      }).ok,
      true
    );
    assert.equal(
      validateProps(Banner, { columns: 1, accent: 'accent', size: ['xl'] }).ok,
      false
    );
  });

  it("exposes presets resolved against the block's own defaults (R781)", () => {
    const schema = toBlockSchema(Banner);
    assert.equal(schema.presets?.Wide.columns, 4);
    assert.equal(schema.presets?.Wide.accent, 'primary');
  });
});

describe('per-device values', () => {
  it('inherits desktop, then tablet', () => {
    const value = { desktop: 3, tablet: 2 };
    assert.equal(valueForDevice(value, 'mobile'), 2);
    assert.equal(inheritedFrom(value, 'mobile'), 'tablet');
    assert.equal(
      valueForDevice(4, 'mobile'),
      4,
      'plain values apply everywhere'
    );
  });

  it('sets and resets one device', () => {
    const value = withDeviceValue(3, 'mobile', 1);
    assert.deepEqual(value, { desktop: 3, mobile: 1 });
    assert.deepEqual(resetDeviceValue(value, 'mobile'), { desktop: 3 });
    assert.equal(resetDeviceValue({ desktop: 3 }, 'desktop'), undefined);
  });
});
