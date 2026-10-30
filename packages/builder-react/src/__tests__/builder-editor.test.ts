import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createBuilderConfig, defineBlock } from '@nextcms/builder-core';
import { z } from 'zod';
import { inspectorBlocksOf } from '../builder-editor';

const Hero = defineBlock({
  type: 'Hero',
  label: 'Hero',
  category: 'Marketing',
  schema: z.object({
    title: z.string().default('Hi'),
    subtitle: z.string().optional(),
  }),
  fields: { subtitle: { type: 'textarea', label: 'Subtitle' } },
  render: () => null as never,
});

describe('inspectorBlocksOf (R758)', () => {
  it('derives an InspectorBlock per block, with its label, fields, and defaults', () => {
    const config = createBuilderConfig({ blocks: [Hero] });
    const blocks = inspectorBlocksOf(config.blocks);
    assert.equal(blocks.Hero.label, 'Hero');
    assert.equal(blocks.Hero.fields.title.type, 'text');
    assert.equal(blocks.Hero.fields.subtitle.type, 'textarea');
    assert.deepEqual(blocks.Hero.defaultProps, { title: 'Hi' });
  });
});
