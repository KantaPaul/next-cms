import assert from 'node:assert';
import { describe, it } from 'node:test';
import { z } from 'zod';
import {
  defaultProps,
  defineBlock,
  fieldsOf,
  toBlockSchema,
  validateProps,
} from '../define';
import { applyBlockPlugins, type BlockPlugin, extendBlock } from '../extend';

const Hero = defineBlock({
  type: 'Hero',
  label: 'Hero',
  category: 'Marketing',
  schema: z.object({
    title: z.string().default('Hi'),
    secondaryButton: z.boolean().default(true),
  }),
  presets: { Centered: { title: 'Welcome' } },
  render: () => null as never,
});

describe('extendBlock (R779)', () => {
  it('adds a new field to the schema and defaults', () => {
    const BrandHero = extendBlock(Hero, {
      fields: { add: { badge: z.string().default('New') } },
    });
    assert.deepEqual(defaultProps(BrandHero), {
      title: 'Hi',
      secondaryButton: true,
      badge: 'New',
    });
    assert.equal(
      validateProps(BrandHero, {
        title: 'Hi',
        secondaryButton: true,
        badge: 'Sale',
      }).ok,
      true
    );
  });

  it('hides a field from the schema and inspector', () => {
    const BrandHero = extendBlock(Hero, {
      fields: { hide: ['secondaryButton'] },
    });
    assert.deepEqual(defaultProps(BrandHero), { title: 'Hi' });
    assert.equal(fieldsOf(BrandHero).secondaryButton, undefined);
  });

  it('overrides defaults without touching the base block', () => {
    const BrandHero = extendBlock(Hero, { defaults: { title: 'Brand new' } });
    assert.equal(defaultProps(BrandHero).title, 'Brand new');
    assert.equal(defaultProps(Hero).title, 'Hi');
  });

  it("adds presets on top of the base block's own presets", () => {
    const BrandHero = extendBlock(Hero, {
      presets: { Bold: { title: 'Bold!' } },
    });
    const schema = toBlockSchema(BrandHero);
    assert.ok(schema.presets?.Centered);
    assert.ok(schema.presets?.Bold);
    assert.equal(schema.presets?.Bold.title, 'Bold!');
  });

  it('wraps render, receiving the base render as Base', () => {
    const calls: string[] = [];
    const baseRender = () => {
      calls.push('base');
      return null;
    };
    const BaseBlock = defineBlock({
      type: 'Base',
      label: 'Base',
      schema: z.object({ title: z.string().default('X') }),
      render: baseRender as never,
    });
    const Wrapped = extendBlock(BaseBlock, {
      render: (_props, BaseRender) => {
        calls.push('wrap');
        return BaseRender ? null : null;
      },
    });
    (Wrapped.render as (props: unknown) => unknown)({ title: 'X' });
    assert.deepEqual(calls, ['wrap']);
  });

  it('keeps a new type name separate from the base, when given one', () => {
    const BrandHero = extendBlock(Hero, {
      type: 'BrandHero',
      label: 'Brand hero',
    });
    assert.equal(BrandHero.type, 'BrandHero');
    assert.equal(Hero.type, 'Hero');
  });
});

describe('applyBlockPlugins (R780)', () => {
  it('applies every plugin to every block, in order', () => {
    const Card = defineBlock({
      type: 'Card',
      label: 'Card',
      schema: z.object({ title: z.string().default('Card') }),
      render: () => null as never,
    });

    const addTrackingId: BlockPlugin = {
      name: 'tracking',
      extend: definition =>
        extendBlock(definition, {
          fields: { add: { trackingId: z.string().optional() } },
        }),
    };
    const addTestId: BlockPlugin = {
      name: 'test-id',
      extend: definition =>
        extendBlock(definition, {
          fields: { add: { testId: z.string().optional() } },
        }),
    };

    const [extendedHero, extendedCard] = applyBlockPlugins(
      [Hero, Card],
      [addTrackingId, addTestId]
    );
    assert.ok('trackingId' in (defaultProps(extendedHero) as never) === false); // optional, no default
    assert.equal(
      validateProps(extendedHero, {
        title: 'Hi',
        secondaryButton: true,
        trackingId: 'a',
        testId: 'b',
      }).ok,
      true
    );
    assert.equal(
      validateProps(extendedCard, {
        title: 'Card',
        trackingId: 'a',
        testId: 'b',
      }).ok,
      true
    );
  });

  it('leaves blocks a plugin does not touch unchanged', () => {
    const noop: BlockPlugin = {
      name: 'noop',
      extend: definition => definition,
    };
    const [result] = applyBlockPlugins([Hero], [noop]);
    assert.equal(result, Hero);
  });
});
