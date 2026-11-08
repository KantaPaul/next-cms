/**
 * Resize handles write the same section settings as the inspector (R695).
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/editor-handles.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cmsInlineProps, cmsResizeHandles } from '../editor-handles';

const node = (type: string, props: Record<string, unknown>) => ({ id: 'n', type, props, slots: {} });

describe('CMS resize handles', () => {
  it('give section blocks width and top/bottom spacing, and Spacer its height', () => {
    assert.deepEqual(cmsResizeHandles(node('Hero', { section: {} })).map(h => h.id), ['section-width', 'section-top', 'section-bottom']);
    assert.deepEqual(cmsResizeHandles(node('Spacer', { height: 96, section: {} })).map(h => h.id), ['spacer-height', 'section-width']);
    assert.deepEqual(cmsResizeHandles(node('Hero', { title: 'Saved without section' })).map(h => h.id), ['section-width', 'section-top', 'section-bottom']);
    assert.deepEqual(cmsResizeHandles(node('GlobalRef', {})), []);
  });

  it('write width per device in %', () => {
    const width = cmsResizeHandles(node('Hero', { section: { paddingY: 'lg' } })).find(h => h.id === 'section-width')!;
    const patch = width.write({ section: { paddingY: 'lg' } }, 'mobile', 80, { start: 100 });
    assert.deepEqual(patch, { section: { paddingY: 'lg', widthUnit: '%', width: { mobile: 80 } } });
    assert.equal(width.read(patch, 'mobile'), 80);
    assert.equal(width.read(patch, 'desktop'), 80, 'inherits until desktop is set');
  });

  it('pin desktop spacing before changing another device', () => {
    const top = cmsResizeHandles(node('Hero', { section: {} })).find(h => h.id === 'section-top')!;
    const bottom = cmsResizeHandles(node('Hero', { section: {} })).find(h => h.id === 'section-bottom')!;
    const patchTop = top.write({ section: {} }, 'mobile', 24, { start: 56 }) as { section: { spacing: Record<string, unknown> } };
    assert.deepEqual(patchTop.section.spacing, { desktop: { top: 56 }, mobile: { top: 24 } });
    const patchBottom = bottom.write({ section: {} }, 'mobile', 24, { start: 56 }) as { section: { spacing: Record<string, unknown> } };
    assert.deepEqual(patchBottom.section.spacing, { desktop: { bottom: 56 }, mobile: { bottom: 24 } });
  });

  it('supports double-click reset to undefined', () => {
    const bottom = cmsResizeHandles(node('Hero', { section: { spacing: { desktop: { bottom: 48 }, mobile: { bottom: 24 } } } })).find(h => h.id === 'section-bottom')!;
    const resetMobile = bottom.write({ section: { spacing: { desktop: { bottom: 48 }, mobile: { bottom: 24 } } } }, 'mobile', undefined, { start: 24 }) as { section: { spacing: Record<string, unknown> } };
    assert.deepEqual(resetMobile.section.spacing, { desktop: { bottom: 48 } });
  });

  it('list inline props from definitions', () => {
    assert.deepEqual(cmsInlineProps('Hero'), ['title', 'subtitle']);
    assert.ok(cmsInlineProps('CTA')?.includes('title'));
  });

  it('gives Column blocks columnWidth on every column except the last, plus sectionTop/Bottom', () => {
    const doc = {
      version: 1 as const,
      root: { props: {} },
      rootSlot: ['hb'],
      nodes: {
        hb: {
          id: 'hb',
          type: 'HeaderBar',
          props: {},
          slots: { columns: ['col-1', 'col-2', 'col-3'] },
        },
        'col-1': { id: 'col-1', type: 'Column', props: { width: 'auto' }, slots: { content: [] } },
        'col-2': { id: 'col-2', type: 'Column', props: { width: 'fill' }, slots: { content: [] } },
        'col-3': { id: 'col-3', type: 'Column', props: { width: 'auto' }, slots: { content: [] } },
      },
    };
    assert.deepEqual(
      cmsResizeHandles(doc.nodes['col-1'], doc).map(h => h.id),
      ['columnWidth', 'section-top', 'section-bottom']
    );
    assert.deepEqual(
      cmsResizeHandles(doc.nodes['col-2'], doc).map(h => h.id),
      ['columnWidth', 'section-top', 'section-bottom']
    );
    assert.deepEqual(
      cmsResizeHandles(doc.nodes['col-3'], doc).map(h => h.id),
      ['section-top', 'section-bottom']
    );
  });

  it('resizes a Column and its right-hand neighbour in %, snapping to 5% with min 5% per device', () => {
    const doc = {
      version: 1 as const,
      root: { props: {} },
      rootSlot: ['hb'],
      nodes: {
        hb: {
          id: 'hb',
          type: 'HeaderBar',
          props: {},
          slots: { columns: ['col-1', 'col-2'] },
        },
        'col-1': { id: 'col-1', type: 'Column', props: { width: 'auto' }, slots: { content: [] } },
        'col-2': { id: 'col-2', type: 'Column', props: { width: 'fill' }, slots: { content: [] } },
      },
    };
    const handle = cmsResizeHandles(doc.nodes['col-1'], doc).find(h => h.id === 'columnWidth')!;
    assert.ok(handle.writeNodes);

    // Dragging +120px when col-1 was 240px (20%) and col-2 was 960px (80%) of 1200px total
    const res = handle.writeNodes({
      id: 'col-1',
      baseDoc: doc,
      device: 'tablet',
      measuredWidths: { 'col-1': 240, 'col-2': 960 },
      deltaPx: 140, // +11.67% -> 31.67% -> snaps to 30%
    });
    assert.equal(res.value, 30);
    assert.equal(res.snapped, true);
    assert.deepEqual(res.patches['col-1'], {
      width: { desktop: 'auto', tablet: '30%' },
    });
    assert.deepEqual(res.patches['col-2'], {
      width: { desktop: 'fill', tablet: '70%' },
    });

    // Clamps to minimum 5% of row on both sides
    const minRes = handle.writeNodes({
      id: 'col-1',
      baseDoc: doc,
      device: 'desktop',
      measuredWidths: { 'col-1': 240, 'col-2': 960 },
      deltaPx: -500,
    });
    assert.equal(minRes.value, 5);
    assert.deepEqual(minRes.patches['col-1'], { width: { desktop: '5%' } });
    assert.deepEqual(minRes.patches['col-2'], { width: { desktop: '95%' } });

    const maxRes = handle.writeNodes({
      id: 'col-1',
      baseDoc: doc,
      device: 'desktop',
      measuredWidths: { 'col-1': 240, 'col-2': 960 },
      deltaPx: 1500,
    });
    assert.equal(maxRes.value, 95);
    assert.deepEqual(maxRes.patches['col-1'], { width: { desktop: '95%' } });
    assert.deepEqual(maxRes.patches['col-2'], { width: { desktop: '5%' } });
  });
});
