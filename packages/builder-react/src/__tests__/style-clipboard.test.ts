import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defineBlock, toBlockSchema } from '@nextcms/builder-core';
import { z } from 'zod';
import { createEditorStore } from '../store';
import {
  copyBlockStyle,
  pasteBlockStyle,
  resetBlockToDefaults,
  hasCopiedBlockStyles,
  getCopiedBlockStyles,
  setCopiedBlockStyles,
} from '../style-clipboard';
import { keyAction } from '../keyboard';

describe('style-clipboard', () => {
  const HeroDef = defineBlock({
    type: 'Hero',
    label: 'Hero',
    schema: z.object({
      title: z.string().default('Default Title'),
      align: z.enum(['left', 'center', 'right']).default('left'),
      section: z.record(z.string(), z.unknown()).optional(),
      elements: z.record(z.string(), z.unknown()).optional(),
    }),
    fields: {
      title: { type: 'text', tab: 'content' },
      align: { type: 'radio', tab: 'style', options: [] },
      section_appearance: { type: 'custom', tab: 'style', path: 'section', render: () => null },
      title_style: { type: 'custom', tab: 'style', path: 'elements.title', render: () => null },
    },
    defaults: {
      title: 'Default Title',
      align: 'left',
      section: { fill: '#ffffff', paddingY: 48 },
    },
    render: () => null,
  });

  const CardDef = defineBlock({
    type: 'Card',
    label: 'Card',
    schema: z.object({
      title: z.string().default('Card Title'),
      section: z.record(z.string(), z.unknown()).optional(),
      elements: z.record(z.string(), z.unknown()).optional(),
    }),
    fields: {
      title: { type: 'text', tab: 'content' },
      section_appearance: { type: 'custom', tab: 'style', path: 'section', render: () => null },
      title_style: { type: 'custom', tab: 'style', path: 'elements.title', render: () => null },
    },
    defaults: {
      title: 'Card Title',
      section: { fill: '#f8fafc', paddingY: 24 },
    },
    render: () => null,
  });

  const HeaderBarDef = defineBlock({
    type: 'HeaderBar',
    label: 'Header bar',
    schema: z.object({
      width: z.enum(['boxed', 'full']).default('boxed'),
      background: z.enum(['default', 'muted', 'dark']).default('default'),
      paddingY: z.enum(['none', 'sm', 'md', 'lg']).default('sm'),
      minHeight: z.string().default(''),
      borderBottom: z.boolean().default(false),
      align: z.enum(['center', 'start', 'end']).default('center'),
    }),
    fields: {
      width: { type: 'radio', tab: 'style', options: [] },
      background: { type: 'select', tab: 'style', options: [] },
      paddingY: { type: 'select', tab: 'style', options: [] },
      minHeight: { type: 'text', tab: 'style' },
      borderBottom: { type: 'radio', tab: 'style', options: [] },
      align: { type: 'radio', tab: 'style', options: [] },
    },
    render: () => null,
  });

  const FooterColumnsDef = defineBlock({
    type: 'FooterColumns',
    label: 'Footer columns',
    schema: z.object({
      width: z.enum(['boxed', 'full']).default('boxed'),
      background: z.enum(['default', 'muted', 'dark']).default('default'),
      paddingY: z.enum(['none', 'sm', 'md', 'lg']).default('lg'),
      columns: z.number().default(4),
    }),
    fields: {
      width: { type: 'radio', tab: 'style', options: [] },
      background: { type: 'select', tab: 'style', options: [] },
      paddingY: { type: 'select', tab: 'style', options: [] },
      columns: { type: 'select', tab: 'content', options: [] },
    },
    render: () => null,
  });

  const LogoDef = defineBlock({
    type: 'Logo',
    label: 'Site logo',
    schema: z.object({
      text: z.string().default('My Site'),
      width: z.number().default(140),
      href: z.string().default('/'),
    }),
    fields: {
      text: { type: 'text' },
      width: { type: 'number', label: 'Width (px)' },
      href: { type: 'text' },
    },
    render: () => null,
  });

  const schemas = {
    Hero: toBlockSchema(HeroDef),
    Card: toBlockSchema(CardDef),
    HeaderBar: toBlockSchema(HeaderBarDef),
    FooterColumns: toBlockSchema(FooterColumnsDef),
    Logo: toBlockSchema(LogoDef),
  };

  it('copies section, elements, and style-tab fields and filters by target definition', () => {
    setCopiedBlockStyles(null);
    const store = createEditorStore({
      document: {
        version: 1,
        root: { props: {} },
        nodes: {
          h1: {
            id: 'h1',
            type: 'Hero',
            props: {
              title: 'Custom Hero',
              align: 'center',
              section: {
                fill: '#ff0000',
                paddingY: 80,
                anchor: 'hero-anchor',
                hideOnMobile: true,
                animation: { entrance: 'fade-in' },
              },
              elements: { title: { color: '#111827' } },
            },
            slots: {},
          },
          c1: {
            id: 'c1',
            type: 'Card',
            props: {
              title: 'Card 1',
              section: {
                fill: '#000000',
                paddingY: 10,
                textColor: '#333333',
                anchor: 'card-anchor',
                hideOnMobile: false,
                hideOnTablet: true,
                animation: { entrance: 'slide-up' },
              },
            },
            slots: {},
          },
        },
        rootSlot: ['h1', 'c1'],
      },
      schemas,
    });

    assert.equal(hasCopiedBlockStyles(), false);
    store.select('h1');

    const copied = copyBlockStyle(store);
    assert.ok(copied);
    assert.deepEqual(copied.section, { fill: '#ff0000', paddingY: 80 });
    assert.deepEqual(copied.elements, { title: { color: '#111827' } });
    assert.equal(copied.align, 'center');
    assert.equal(hasCopiedBlockStyles(), true);

    // Paste onto c1 (Card has section and elements, but NOT align)
    const pasted = pasteBlockStyle(store, 'c1');
    assert.equal(pasted, true);

    const c1Node = store.getState().doc.nodes.c1;
    // Deep-merged section: fill & paddingY updated, textColor & anchor & hide flags & animation kept
    assert.deepEqual(c1Node.props.section, {
      fill: '#ff0000',
      paddingY: 80,
      textColor: '#333333',
      anchor: 'card-anchor',
      hideOnMobile: false,
      hideOnTablet: true,
      animation: { entrance: 'slide-up' },
    });
    assert.deepEqual(c1Node.props.elements, { title: { color: '#111827' } });
    // Card has no align field in its definition, so align was not pasted
    assert.equal('align' in c1Node.props, false);
    // Non-style props remain intact
    assert.equal(c1Node.props.title, 'Card 1');
  });

  it('copies top-level style-tab fields on header/footer blocks and keeps previous clipboard on empty copy', () => {
    setCopiedBlockStyles(null);
    const store = createEditorStore({
      document: {
        version: 1,
        root: { props: {} },
        nodes: {
          hb: {
            id: 'hb',
            type: 'HeaderBar',
            props: {
              width: 'full',
              background: 'dark',
              paddingY: 'lg',
              minHeight: '80px',
              borderBottom: true,
              align: 'start',
            },
            slots: {},
          },
          fc: {
            id: 'fc',
            type: 'FooterColumns',
            props: {
              width: 'boxed',
              background: 'default',
              paddingY: 'sm',
              columns: 4,
            },
            slots: {},
          },
          logo: {
            id: 'logo',
            type: 'Logo',
            props: {
              text: 'Brand',
              width: 140,
              href: '/',
            },
            slots: {},
          },
        },
        rootSlot: ['hb', 'fc', 'logo'],
      },
      schemas,
    });

    const copied = copyBlockStyle(store, 'hb');
    assert.deepEqual(copied, {
      width: 'full',
      background: 'dark',
      paddingY: 'lg',
      minHeight: '80px',
      borderBottom: true,
      align: 'start',
    });

    // Copying from Logo (no style fields) returns null and keeps the previous clipboard
    const emptyCopy = copyBlockStyle(store, 'logo');
    assert.equal(emptyCopy, null);
    assert.deepEqual(getCopiedBlockStyles(), copied);

    // Pasting onto FooterColumns only applies width, background, paddingY
    const pasted = pasteBlockStyle(store, 'fc');
    assert.equal(pasted, true);
    const fcProps = store.getState().doc.nodes.fc.props;
    assert.equal(fcProps.width, 'full');
    assert.equal(fcProps.background, 'dark');
    assert.equal(fcProps.paddingY, 'lg');
    assert.equal(fcProps.columns, 4);
    assert.equal('minHeight' in fcProps, false);
    assert.equal('borderBottom' in fcProps, false);
    assert.equal('align' in fcProps, false);
  });

  it('keeps a column width out of copied style, so pasting cannot reflow the row', () => {
    setCopiedBlockStyles(null);
    const ColumnDef = defineBlock({
      type: 'Column',
      label: 'Column',
      schema: z.object({ width: z.string().optional(), align: z.string().optional() }),
      fields: {
        width: { type: 'text', tab: 'style' },
        align: { type: 'radio', tab: 'style', options: [] },
      },
      render: () => null,
    });
    const store = createEditorStore({
      document: {
        version: 1,
        root: { props: {} },
        nodes: {
          a: { id: 'a', type: 'Column', props: { width: 'fill', align: 'end' }, slots: {} },
          b: { id: 'b', type: 'Column', props: { width: 'auto', align: 'start' }, slots: {} },
        },
        rootSlot: ['a', 'b'],
      },
      schemas: { Column: toBlockSchema(ColumnDef) },
    });
    assert.deepEqual(copyBlockStyle(store, 'a'), { align: 'end' });
    assert.equal(pasteBlockStyle(store, 'b'), true);
    assert.deepEqual(store.getState().doc.nodes.b.props, { width: 'auto', align: 'end' });
  });

  it('resets a block to its schema defaultProps', () => {
    const store = createEditorStore({
      document: {
        version: 1,
        root: { props: {} },
        nodes: {
          h1: {
            id: 'h1',
            type: 'Hero',
            props: {
              title: 'Modified Title',
              section: { fill: '#123456', paddingY: 120 },
            },
            slots: {},
          },
        },
        rootSlot: ['h1'],
      },
      schemas,
    });

    store.select('h1');
    const reset = resetBlockToDefaults(store, 'h1');
    assert.equal(reset, true);

    const h1Node = store.getState().doc.nodes.h1;
    assert.equal(h1Node.props.title, 'Default Title');
    assert.deepEqual(h1Node.props.section, { fill: '#ffffff', paddingY: 48 });
  });

  it('recognizes keyboard shortcuts for copy-style, paste-style, and inspect', () => {
    // ⌘⇧C and Ctrl+Shift+C
    assert.equal(
      keyAction({ key: 'c', metaKey: true, shiftKey: true, code: 'KeyC' }),
      'copy-style'
    );
    assert.equal(
      keyAction({ key: 'c', ctrlKey: true, shiftKey: true, code: 'KeyC' }),
      'copy-style'
    );
    // ⌘⇧V and Ctrl+Shift+V
    assert.equal(
      keyAction({ key: 'v', metaKey: true, shiftKey: true, code: 'KeyV' }),
      'paste-style'
    );
    assert.equal(
      keyAction({ key: 'v', ctrlKey: true, shiftKey: true, code: 'KeyV' }),
      'paste-style'
    );
    // Legacy ⌥⌘C and ⌥⌘V
    assert.equal(
      keyAction({ key: 'c', metaKey: true, altKey: true, code: 'KeyC' }),
      'copy-style'
    );
    assert.equal(
      keyAction({ key: 'v', metaKey: true, altKey: true, code: 'KeyV' }),
      'paste-style'
    );
    // ⌥I
    assert.equal(
      keyAction({ key: 'i', altKey: true, code: 'KeyI' }),
      'inspect'
    );
  });
});
