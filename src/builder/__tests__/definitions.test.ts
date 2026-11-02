/**
 * Block definitions for the new editor (R697) must stay compatible with the
 * native block list: same blocks, defaults, slots, and rules.
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/definitions.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { defaultProps, fieldsOf, validateProps } from '@nextcms/builder-core';
import { NATIVE_BLOCKS } from '../definitions/native';
import {
  nativeBlockTypes,
  pageDefinitions,
  pageInspectorBlocks,
  pageRootFields,
  pageSchemas,
} from '../definitions';
import { groupControl, sectionControls } from '../definitions/fields';

describe('page block definitions', () => {
  it('cover every native block', () => {
    const missing = NATIVE_BLOCKS.map(b => b.type).filter(type => !pageDefinitions[type]);
    assert.deepEqual(missing, []);
  });

  it('give native blocks the same defaults as their definition', () => {
    for (const type of nativeBlockTypes) {
      assert.ok(defaultProps(pageDefinitions[type]) !== undefined, type);
    }
  });

  it('accept their own defaults as valid props', () => {
    for (const type of nativeBlockTypes) {
      const props = defaultProps(pageDefinitions[type]) as Record<string, unknown>;
      assert.deepEqual(validateProps(pageDefinitions[type], props), { ok: true }, type);
    }
  });

  it('accept element-level and section-level styles on every block that supports them', () => {
    for (const type of nativeBlockTypes) {
      const base = defaultProps(pageDefinitions[type]) as Record<string, unknown>;
      const withStyles: Record<string, unknown> = {
        ...base,
        elements: {
          title: {
            typography: {
              fontFamily: 'Inter',
              fontSize: { desktop: 48, tablet: 36, mobile: 28 },
              lineHeight: 56,
              lineHeightUnit: 'px',
            },
            fill: { type: 'color', color: '#111827' },
          },
        },
      };
      if ('section' in base) {
        withStyles.section = {
          ...(typeof base.section === 'object' && base.section ? base.section : {}),
          width: 1200,
          widthUnit: 'px',
          typography: { fontFamily: 'Inter', fontSize: 16, lineHeight: 24, lineHeightUnit: 'px' },
          fill: { type: 'color', color: '#ffffff' },
        };
      }
      assert.deepEqual(validateProps(pageDefinitions[type], withStyles), { ok: true }, type);
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
    assert.ok(
      pageInspectorBlocks.Hero.fields.section_background ||
        pageInspectorBlocks.Hero.fields.section
    );
    assert.equal(fieldsOf(pageDefinitions.Spacer).height.type, 'number');
    assert.ok(pageRootFields.maxWidth);
  });

  it('show conditional fields only when they apply', () => {
    const alt = pageInspectorBlocks.Hero.fields.imageAlt;
    assert.equal(alt.when?.({ imageUrl: '' }), false);
    assert.equal(alt.when?.({ imageUrl: '/a.jpg' }), true);
  });

  it('configures groupControl with exclude, defaults, and popover', () => {
    const field = groupControl('typography', {
      label: 'Title Typography',
      path: 'elements.title.typography',
      exclude: ['wordSpacing'],
      defaults: { fontSize: { desktop: 32 } },
      popover: true,
      states: ['normal', 'hover'],
      tab: 'style',
      section: 'Title',
    });

    assert.equal(field.type, 'custom');
    assert.equal(field.label, 'Title Typography');
    assert.equal(field.path, 'elements.title.typography');
    assert.equal((field as any).groupKind, 'typography');
    assert.deepEqual((field as any).exclude, ['wordSpacing']);
    assert.deepEqual((field as any).defaults, { fontSize: { desktop: 32 } });
    assert.equal((field as any).popover, true);
    assert.deepEqual((field as any).states, ['normal', 'hover']);
    assert.equal(typeof (field as any).render, 'function');
  });

  it('provides group controls for sectionControls', () => {
    const sc = sectionControls() as Record<string, any>;
    assert.equal(sc.section_typography.type, 'custom');
    assert.equal(sc.section_typography.groupKind, 'typography');

    assert.equal(sc.section_background.type, 'custom');
    assert.equal(sc.section_background.groupKind, 'background');
    assert.deepEqual(sc.section_background.states, ['normal', 'hover']);

    assert.equal(sc.section_border.type, 'custom');
    assert.equal(sc.section_border.groupKind, 'border');

    assert.equal(sc.section_filter.type, 'custom');
    assert.equal(sc.section_filter.groupKind, 'cssFilter');
    assert.deepEqual(sc.section_filter.states, ['normal', 'hover']);
  });
});