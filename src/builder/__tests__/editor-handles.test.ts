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
});
