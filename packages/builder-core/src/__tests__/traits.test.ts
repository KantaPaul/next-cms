import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import {
  composeRender,
  defaultProps,
  defineBlock,
  fieldsOf,
  toBlockSchema,
  validateProps,
  withAnimation,
  withDynamic,
  withLayout,
  withStyle,
  withVisibility,
} from '../index';
import type { BlockDefinition, PropTrait } from '../index';
import type { BlockRender } from '../traits';

const Hero = defineBlock({
  type: 'Hero',
  label: 'Hero',
  category: 'Marketing',
  schema: z.object({
    title: z.string().default('Hi'),
  }),
  traits: [withStyle()],
  render: () => null as never,
});

const PricingCard = defineBlock({
  type: 'PricingCard',
  label: 'Pricing card',
  category: 'Marketing',
  schema: z.object({
    title: z.string().default('Pro'),
    price: z.number().min(0).default(29),
  }),
  traits: [withStyle(), withAnimation()],
  render: () => null as never,
});

describe('prop traits (R777)', () => {
  it('adds opted-in trait props to the defaults', () => {
    assert.deepEqual(defaultProps(Hero), { title: 'Hi', style: {} });
    assert.deepEqual(toBlockSchema(Hero).defaultProps, { title: 'Hi', style: {} });
  });

  it('validates trait props and rejects values that break the trait schema', () => {
    const ok = validateProps(Hero, { title: 'Hello', style: { padding: '12px', margin: '8px', gap: 4 } });
    assert.deepEqual(ok, { ok: true });
    const bad = validateProps(Hero, { title: 'Hello', style: { padding: 12 } });
    assert.equal(bad.ok, false);
    assert.ok(bad.ok === false && bad.issues.length > 0);
  });

  it('keeps block fields and adds the trait fields without dropping generated ones', () => {
    const fields = fieldsOf(Hero);
    assert.equal(fields.title.type, 'text');
    assert.ok(fields.style);
    assert.equal((fields.style as { group?: string }).group, 'Style');
  });

  it('merges defaults from several traits', () => {
    assert.deepEqual(defaultProps(PricingCard), { title: 'Pro', price: 29, style: {}, animation: {} });
  });

  it('exposes the named trait factories with their prop groups', () => {
    assert.equal(withLayout().name, 'layout');
    assert.equal(withAnimation().name, 'animation');
    assert.equal(withDynamic().name, 'dynamic');
    assert.equal(withVisibility().name, 'visibility');
    assert.equal(withStyle().name, 'style');
  });

  it('composes trait render wrappers over the block render in order', () => {
    const base = (() => null) as unknown as BlockRender;
    const first: PropTrait = { name: 'first', wrap: r => r };
    const second: PropTrait = { name: 'second', wrap: r => r };
    const composed = composeRender(
      { render: base } as BlockDefinition,
      [first, second]
    );
    assert.equal(composed, base);
  });
});
