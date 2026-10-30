import assert from 'node:assert';
import { describe, it } from 'node:test';
import { DOCUMENT_VERSION } from '@nextcms/builder-core';
import { libraryItems } from '../block-list';
import { layerNodes } from '../layers';

const doc = {
  version: DOCUMENT_VERSION,
  root: { props: {} },
  rootSlot: ['cols', 'box', 'text'],
  nodes: {
    cols: {
      id: 'cols',
      type: 'Columns',
      props: {},
      slots: { column1: ['a'], column2: [] },
    },
    box: { id: 'box', type: 'Box', props: {}, slots: { content: ['b'] } },
    text: {
      id: 'text',
      type: 'Text',
      props: {},
      slots: {},
      meta: { name: 'Intro', hidden: true, locked: true },
    },
    a: { id: 'a', type: 'Text', props: {}, slots: {} },
    b: { id: 'b', type: 'Text', props: {}, slots: {} },
  },
};

describe('layerNodes (B15 E4)', () => {
  const nodes = layerNodes(doc, type => `${type} block`);

  it('gives a block with several slots a heading per slot, keyed id::slot', () => {
    const cols = nodes[0];
    assert.deepEqual(
      cols.children?.map(c => [c.id, c.name, c.group]),
      [
        ['cols::column1', 'Column 1', true],
        ['cols::column2', 'Column 2', true],
      ]
    );
    assert.deepEqual(
      cols.children?.[0].children?.map(c => c.id),
      ['a']
    );
  });

  it('puts a single slot’s children directly under the block', () => {
    assert.deepEqual(
      nodes[1].children?.map(c => c.id),
      ['b']
    );
  });

  it('uses the custom name, keeps it for rename, and carries hidden and locked', () => {
    const text = nodes[2];
    assert.equal(text.name, 'Intro');
    assert.equal(text.renameValue, 'Intro');
    assert.equal(text.hidden, true);
    assert.equal(text.locked, true);
    assert.equal(nodes[1].name, 'Box block');
    assert.equal(nodes[1].renameValue, '');
  });
});

describe('libraryItems (B15 E4)', () => {
  it('keeps group order and the first group of a repeated type', () => {
    const items = libraryItems(
      [
        { title: 'Heroes', types: ['Hero', 'Cta'] },
        { title: 'Marketing', types: ['Cta', 'Stats'] },
      ],
      type => type.toUpperCase()
    );
    assert.deepEqual(
      items.map(i => [i.type, i.label, i.category]),
      [
        ['Hero', 'HERO', 'Heroes'],
        ['Cta', 'CTA', 'Heroes'],
        ['Stats', 'STATS', 'Marketing'],
      ]
    );
  });
});
