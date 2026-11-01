import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
  const schemas = {
    Hero: {
      type: 'Hero',
      label: 'Hero',
      defaultProps: {
        title: 'Default Title',
        section: { fill: '#ffffff', paddingY: 48 },
      },
      fields: {
        title: { type: 'text', tab: 'content' },
        fill: { type: 'color', tab: 'style', section: 'Background' },
      },
    },
    Card: {
      type: 'Card',
      label: 'Card',
      defaultProps: {
        title: 'Card Title',
        section: { fill: '#f8fafc', paddingY: 24 },
      },
      fields: {
        title: { type: 'text', tab: 'content' },
      },
    },
  };

  it('copies section and elements style data from selected block', () => {
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
              section: { fill: '#ff0000', paddingY: 80 },
              elements: { title: { color: '#111827' } },
            },
            slots: {},
          },
          c1: {
            id: 'c1',
            type: 'Card',
            props: {
              title: 'Card 1',
              section: { fill: '#000000', paddingY: 10 },
            },
            slots: {},
          },
        },
        rootSlot: ['h1', 'c1'],
      },
      schemas: schemas as any,
    });

    assert.equal(hasCopiedBlockStyles(), false);
    store.select('h1');

    const copied = copyBlockStyle(store);
    assert.ok(copied);
    assert.deepEqual(copied.section, { fill: '#ff0000', paddingY: 80 });
    assert.deepEqual(copied.elements, { title: { color: '#111827' } });
    assert.equal(hasCopiedBlockStyles(), true);

    // Paste onto c1
    const pasted = pasteBlockStyle(store, 'c1');
    assert.equal(pasted, true);

    const c1Node = store.getState().doc.nodes.c1;
    assert.deepEqual(c1Node.props.section, { fill: '#ff0000', paddingY: 80 });
    assert.deepEqual(c1Node.props.elements, { title: { color: '#111827' } });
    // Non-style props remain intact
    assert.equal(c1Node.props.title, 'Card 1');
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
      schemas: schemas as any,
    });

    store.select('h1');
    const reset = resetBlockToDefaults(store, 'h1');
    assert.equal(reset, true);

    const h1Node = store.getState().doc.nodes.h1;
    assert.equal(h1Node.props.title, 'Default Title');
    assert.deepEqual(h1Node.props.section, { fill: '#ffffff', paddingY: 48 });
  });

  it('recognizes keyboard shortcuts for copy-style, paste-style, and inspect', () => {
    // ⌥⌘C
    assert.equal(
      keyAction({ key: 'c', metaKey: true, altKey: true, code: 'KeyC' }),
      'copy-style'
    );
    // ⌥⌘V
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
