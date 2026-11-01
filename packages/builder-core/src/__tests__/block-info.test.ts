import assert from 'node:assert';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { defineBlock, toBlockSchema } from '../define';

describe('block info metadata', () => {
  it('carries insert-panel metadata from the definition to the schema', () => {
    const Hero = defineBlock({
      type: 'Hero',
      label: 'Hero',
      category: 'heroes',
      icon: 'hero',
      description: 'Headline banner',
      capabilities: ['Two buttons'],
      semanticTag: 'section',
      nesting: 'leaf',
      defaultSize: '100% × auto',
      schema: z.object({ title: z.string().default('Hi') }),
      render: () => null,
    });
    const schema = toBlockSchema(Hero);
    assert.equal(schema.category, 'heroes');
    assert.equal(schema.icon, 'hero');
    assert.equal(schema.description, 'Headline banner');
    assert.deepEqual(schema.capabilities, ['Two buttons']);
    assert.equal(schema.semanticTag, 'section');
    assert.equal(schema.nesting, 'leaf');
    assert.equal(schema.defaultSize, '100% × auto');
  });

  it('leaves unset metadata off the schema', () => {
    const Plain = defineBlock({
      type: 'Plain',
      label: 'Plain',
      schema: z.object({}),
      render: () => null,
    });
    const schema = toBlockSchema(Plain);
    assert.ok(!('description' in schema));
    assert.ok(!('nesting' in schema));
  });
});
