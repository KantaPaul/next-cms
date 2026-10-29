import { describe, it } from 'node:test';
import assert from 'node:assert';
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
    assert.deepEqual(defaultProps(Card), { title: 'Pro', price: 29, featured: false, tone: 'light' });
    assert.equal(defaultProps(Card, { locale: 'fr' }).title, 'Pro (FR)');
  });

  it('keeps explicit fields and generates the rest from the schema', () => {
    const fields = fieldsOf(Card);
    assert.equal(fields.title.type, 'textarea');
    assert.equal(fields.price.type, 'number');
    assert.equal(fields.featured.type, 'toggle');
    assert.deepEqual(fields.tone.type === 'select' && fields.tone.options.map(o => o.value), ['light', 'dark']);
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

describe('per-device values', () => {
  it('inherits desktop, then tablet', () => {
    const value = { desktop: 3, tablet: 2 };
    assert.equal(valueForDevice(value, 'mobile'), 2);
    assert.equal(inheritedFrom(value, 'mobile'), 'tablet');
    assert.equal(valueForDevice(4, 'mobile'), 4, 'plain values apply everywhere');
  });

  it('sets and resets one device', () => {
    const value = withDeviceValue(3, 'mobile', 1);
    assert.deepEqual(value, { desktop: 3, mobile: 1 });
    assert.deepEqual(resetDeviceValue(value, 'mobile'), { desktop: 3 });
    assert.equal(resetDeviceValue({ desktop: 3 }, 'desktop'), undefined);
  });
});
