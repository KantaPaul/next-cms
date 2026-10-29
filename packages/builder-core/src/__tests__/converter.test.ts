/**
 * Round-trip tests for the Puck ↔ BuilderDocument converter (R683).
 *
 * Run with: pnpm --filter @nextcms/builder-core test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { PuckData } from '../puck-data';
import {
  documentToPuck,
  documentsEqual,
  puckDataEqual,
  puckToDocument,
  toDocument,
  toPuckData,
} from '../converter';
import { DOCUMENT_VERSION, emptyDocument, isBuilderDocument } from '../document';

const flatPage: PuckData = {
  root: { props: { maxWidth: 'xl', theme: 'site', paddingY: 'none' } },
  content: [
    {
      type: 'Hero',
      props: {
        id: 'hero-1',
        title: 'Hello',
        section: { paddingY: 'lg' },
      },
    },
    {
      type: 'CTA',
      props: {
        id: 'cta-1',
        title: 'Get started',
        section: {},
      },
    },
  ],
  zones: {},
};

const containerPage: PuckData = {
  root: { props: { maxWidth: 'full' } },
  content: [
    {
      type: 'Container',
      props: {
        id: 'ctr-1',
        container: { mode: 'flex', direction: { desktop: 'row' } },
        section: {},
      },
    },
  ],
  zones: {
    'ctr-1:content': [
      {
        type: 'RichText',
        props: { id: 'rt-1', content: '<p>Hi</p>', section: {} },
      },
      {
        type: 'Button',
        props: { id: 'btn-1', label: 'Go', link: '/', section: {} },
      },
    ],
  },
};

const columnsPage: PuckData = {
  root: { props: {} },
  content: [
    {
      type: 'Columns',
      props: { id: 'cols-1', columns: 2, section: {} },
    },
  ],
  zones: {
    'cols-1:column1': [
      { type: 'Image', props: { id: 'img-1', url: '/a.jpg', section: {} } },
    ],
    'cols-1:column2': [
      { type: 'RichText', props: { id: 'rt-2', content: '<p>B</p>', section: {} } },
    ],
  },
};

const tabsPage: PuckData = {
  root: { props: {} },
  content: [
    {
      type: 'Tabs',
      props: {
        id: 'tabs-1',
        items: [{ label: 'One' }, { label: 'Two' }],
        section: {},
      },
    },
  ],
  zones: {
    'tabs-1:items[0].content': [
      { type: 'RichText', props: { id: 'rt-t0', content: '<p>Tab 1</p>', section: {} } },
    ],
    'tabs-1:items[1].content': [
      { type: 'RichText', props: { id: 'rt-t1', content: '<p>Tab 2</p>', section: {} } },
    ],
  },
};

describe('puckToDocument', () => {
  it('converts a flat page',
    () => {
      const doc = puckToDocument(flatPage);
      assert.equal(doc.version, DOCUMENT_VERSION);
      assert.deepEqual(doc.root.props, flatPage.root.props);
      assert.deepEqual(doc.rootSlot, ['hero-1', 'cta-1']);
      assert.equal(doc.nodes['hero-1'].type, 'Hero');
      assert.equal(doc.nodes['hero-1'].props.title, 'Hello');
      assert.deepEqual(doc.nodes['hero-1'].slots, {});
    });

  it('converts Container content zones into slots.content',
    () => {
      const doc = puckToDocument(containerPage);
      assert.deepEqual(doc.rootSlot, ['ctr-1']);
      assert.deepEqual(doc.nodes['ctr-1'].slots.content, ['rt-1', 'btn-1']);
      assert.equal(doc.nodes['rt-1'].type, 'RichText');
      assert.equal(doc.nodes['btn-1'].props.label, 'Go');
    });

  it('converts Columns columnN zones',
    () => {
      const doc = puckToDocument(columnsPage);
      assert.deepEqual(doc.nodes['cols-1'].slots.column1, ['img-1']);
      assert.deepEqual(doc.nodes['cols-1'].slots.column2, ['rt-2']);
    });

  it('converts Tabs items[i].content zone paths',
    () => {
      const doc = puckToDocument(tabsPage);
      assert.deepEqual(doc.nodes['tabs-1'].slots['items[0].content'], ['rt-t0']);
      assert.deepEqual(doc.nodes['tabs-1'].slots['items[1].content'], ['rt-t1']);
      assert.deepEqual(
        (doc.nodes['tabs-1'].props.items as { label: string }[]).map(i => i.label),
        ['One', 'Two']
      );
    });
});

describe('documentToPuck', () => {
  it('round-trips a flat page',
    () => {
      const doc = puckToDocument(flatPage);
      const back = documentToPuck(doc);
      assert.ok(puckDataEqual(flatPage, back));
    });

  it('round-trips Container zones',
    () => {
      const doc = puckToDocument(containerPage);
      const back = documentToPuck(doc, { slots: 'zones' });
      assert.ok(puckDataEqual(containerPage, back));
      assert.deepEqual(
        back.zones?.['ctr-1:content']?.map(i => i.props.id),
        ['rt-1', 'btn-1']
      );
    });

  it('round-trips Columns and Tabs',
    () => {
      const zones = { slots: 'zones' } as const;
      assert.ok(puckDataEqual(columnsPage, documentToPuck(puckToDocument(columnsPage), zones)));
      assert.ok(puckDataEqual(tabsPage, documentToPuck(puckToDocument(tabsPage), zones)));
    });

  it('document → puck → document preserves the node map',
    () => {
      const doc = puckToDocument(containerPage);
      const again = puckToDocument(documentToPuck(doc));
      assert.ok(documentsEqual(doc, again));
    });
});

describe('items saved without an id', () => {
  const noIds = {
    root: { props: {} },
    content: [
      { type: 'Hero', props: { title: 'A' } },
      { type: 'Hero', props: { title: 'B' } },
    ],
    zones: {},
  } as unknown as PuckData;

  it('get the same generated ids every time', () => {
    assert.deepEqual(puckToDocument(noIds).rootSlot, ['Hero-auto-1', 'Hero-auto-2']);
    assert.ok(documentsEqual(puckToDocument(noIds), puckToDocument(noIds)));
  });

  it('round-trip without gaining an id', () => {
    assert.ok(puckDataEqual(noIds, documentToPuck(puckToDocument(noIds))));
  });
});

describe('toDocument / toPuckData adapters', () => {
  it('detects each format',
    () => {
      const doc = puckToDocument(flatPage);
      assert.ok(isBuilderDocument(toDocument(doc)));
      assert.ok(isBuilderDocument(toDocument(flatPage)));
      assert.equal(toDocument(null).rootSlot.length, 0);
      assert.ok(puckDataEqual(flatPage, toPuckData(flatPage)));
      assert.ok(puckDataEqual(flatPage, toPuckData(doc)));
    });

  it('emptyDocument is a valid starting point',
    () => {
      const empty = emptyDocument();
      assert.equal(empty.version, DOCUMENT_VERSION);
      assert.deepEqual(empty.rootSlot, []);
      assert.ok(puckDataEqual(
        { root: { props: {} }, content: [], zones: {} },
        documentToPuck(empty)
      ));
    });
});
