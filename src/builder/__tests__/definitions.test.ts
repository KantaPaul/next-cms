/**
 * Block definitions for the new editor (R697) must stay compatible with the
 * Puck config while both editors run: same blocks, defaults, slots, and rules.
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/definitions.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { defaultProps, fieldsOf, validateProps } from '@nextcms/builder-core';
import { builderConfig } from '../config';
import {
  nativeBlockTypes,
  pageDefinitions,
  pageInspectorBlocks,
  pageRootFields,
  pageSchemas,
} from '../definitions';

describe('page block definitions', () => {
  it('cover every block in the Puck config', () => {
    const missing = Object.keys(builderConfig.components).filter(type => !pageDefinitions[type]);
    assert.deepEqual(missing, []);
  });

  it('give native blocks the same defaults as the Puck config', () => {
    for (const type of nativeBlockTypes) {
      assert.deepEqual(
        defaultProps(pageDefinitions[type]),
        builderConfig.components[type].defaultProps,
        type
      );
    }
  });

  it('accept the Puck defaults as valid props', () => {
    for (const type of nativeBlockTypes) {
      const props = builderConfig.components[type].defaultProps as Record<string, unknown>;
      assert.deepEqual(validateProps(pageDefinitions[type], props), { ok: true }, type);
    }
  });

  it('keep slots and nesting rules', () => {
    assert.deepEqual(pageSchemas.Columns.slots?.column1, { allow: undefined, disallow: ['Columns', 'GlobalRef'] });
    assert.ok(pageSchemas.Container.slots?.content);
    assert.ok(pageSchemas.Tabs.arraySlots?.items?.content);
  });

  it('give every block inspector fields, and the page its settings', () => {
    for (const [type, block] of Object.entries(pageInspectorBlocks)) {
      assert.ok(block.label, type);
    }
    assert.equal(pageInspectorBlocks.Hero.fields.title.type, 'textarea');
    assert.equal(pageInspectorBlocks.Hero.fields.section.type, 'custom');
    assert.equal(fieldsOf(pageDefinitions.Spacer).height.type, 'number');
    assert.ok(pageRootFields.maxWidth);
  });

  it('show conditional fields only when they apply', () => {
    const alt = pageInspectorBlocks.Hero.fields.imageAlt;
    assert.equal(alt.when?.({ imageUrl: '' }), false);
    assert.equal(alt.when?.({ imageUrl: '/a.jpg' }), true);
  });
});
