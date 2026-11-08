import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canPlace,
  DOCUMENT_VERSION,
  type BuilderDocument,
  type PuckData,
  toDocument,
} from '@nextcms/builder-core';
import {
  createEditorStore,
  layerNodes,
  quickInsertItemsForSlot,
} from '@nextcms/builder-react';
import { normalizeContent } from '../data';
import { editorSetup } from '../definitions';
import {
  deterministicColumnId,
  migrateColumnBlocks,
  migrateDocumentColumns,
  migrateInlineColumns,
  migrateZonesColumns,
} from '../migrations/column-blocks';
import { normalizeGlobalContent } from '../normalize-global-content';

describe('Stage 2: Column blocks migration', () => {
  it('migrates Puck zones format across Columns, HeaderBar, HeaderColumns, and FooterColumns', () => {
    const legacy: PuckData = {
      root: { props: {} },
      content: [
        {
          type: 'Columns',
          props: { id: 'cols-1', layout: '2-1', gap: 'md' },
        },
        {
          type: 'HeaderBar',
          props: {
            id: 'hbar-1',
            layout: 'custom',
            leftWidth: 'custom',
            leftSize: '220px',
            leftAlign: 'start',
            centerWidth: 'fill',
            centerAlign: 'center',
            rightWidth: 'auto',
            rightAlign: 'end',
          },
        },
        {
          type: 'HeaderColumns',
          props: {
            id: 'hcols-1',
            columns: 2,
            col1Width: 'auto',
            col1Align: 'start',
            col2Width: 'custom',
            col2Size: '60%',
            col2Align: 'end',
          },
        },
        {
          type: 'FooterColumns',
          props: { id: 'fcols-1', columns: 3, gap: 'lg' },
        },
      ],
      zones: {
        'cols-1:column1': [{ type: 'Heading', props: { id: 'h-1', text: 'Left' } }],
        'cols-1:column2': [{ type: 'RichText', props: { id: 'rt-1', content: '<p>Right</p>' } }],
        'hbar-1:left': [{ type: 'Logo', props: { id: 'logo-1' } }],
        'hbar-1:center': [{ type: 'Navigation', props: { id: 'nav-1' } }],
        'hbar-1:right': [{ type: 'Button', props: { id: 'btn-1', label: 'CTA' } }],
        'hcols-1:col1': [{ type: 'Logo', props: { id: 'logo-2' } }],
        'hcols-1:col2': [{ type: 'SearchBox', props: { id: 'sb-1' } }],
        'fcols-1:col1': [{ type: 'FooterLinks', props: { id: 'fl-1' } }],
        'fcols-1:col2': [{ type: 'FooterLinks', props: { id: 'fl-2' } }],
        'fcols-1:col3': [{ type: 'Copyright', props: { id: 'cp-1' } }],
      },
    };

    const migrated = migrateZonesColumns(legacy);

    // 1. Columns (2-1 -> 2fr, 1fr)
    const colsZone = migrated.zones?.['cols-1:columns'] ?? [];
    assert.equal(colsZone.length, 2);
    assert.equal(colsZone[0].type, 'Column');
    assert.equal(colsZone[0].props.id, deterministicColumnId('cols-1', 'column1'));
    assert.equal(colsZone[0].props.width, '2fr');
    assert.equal(colsZone[1].props.id, deterministicColumnId('cols-1', 'column2'));
    assert.equal(colsZone[1].props.width, '1fr');
    assert.deepEqual(
      migrated.zones?.['cols-1-col-column1:content']?.map(x => x.props.id),
      ['h-1']
    );
    assert.deepEqual(
      migrated.zones?.['cols-1-col-column2:content']?.map(x => x.props.id),
      ['rt-1']
    );
    assert.equal(migrated.zones?.['cols-1:column1'], undefined);

    // 2. HeaderBar (custom -> 220px start, fill center, auto end)
    const hbarZone = migrated.zones?.['hbar-1:columns'] ?? [];
    assert.equal(hbarZone.length, 3);
    assert.equal(hbarZone[0].props.width, '220px');
    assert.equal(hbarZone[0].props.align, 'start');
    assert.equal(hbarZone[1].props.width, 'fill');
    assert.equal(hbarZone[1].props.align, 'center');
    assert.equal(hbarZone[2].props.width, 'auto');
    assert.equal(hbarZone[2].props.align, 'end');

    // 3. HeaderColumns (2 columns: auto start, 60% end)
    const hcolsZone = migrated.zones?.['hcols-1:columns'] ?? [];
    assert.equal(hcolsZone.length, 2);
    assert.equal(hcolsZone[0].props.width, 'auto');
    assert.equal(hcolsZone[0].props.align, 'start');
    assert.equal(hcolsZone[1].props.width, '60%');
    assert.equal(hcolsZone[1].props.align, 'end');

    // 4. FooterColumns (3 columns: fill, fill, fill)
    const fcolsZone = migrated.zones?.['fcols-1:columns'] ?? [];
    assert.equal(fcolsZone.length, 3);
    assert.deepEqual(
      fcolsZone.map(c => c.props.width),
      ['fill', 'fill', 'fill']
    );

    // Idempotent: second run returns same reference
    const second = migrateZonesColumns(migrated);
    assert.equal(second, migrated);
  });

  it('migrates inline slot arrays on props', () => {
    const inlineData: PuckData = {
      root: { props: {} },
      content: [
        {
          type: 'HeaderBar',
          props: {
            id: 'hb-inline',
            layout: 'left-heavy',
            left: [{ type: 'Logo', props: { id: 'l1' } }],
            center: [{ type: 'Navigation', props: { id: 'n1' } }],
            right: [{ type: 'Button', props: { id: 'b1' } }],
          },
        },
      ],
      zones: {},
    };

    const migrated = migrateInlineColumns(inlineData);
    const hb = migrated.content[0];
    assert.equal(hb.props.left, undefined);
    assert.equal(hb.props.center, undefined);
    assert.equal(hb.props.right, undefined);
    const cols = hb.props.columns as any[];
    assert.equal(Array.isArray(cols), true);
    assert.equal(cols.length, 3);
    assert.deepEqual(
      cols.map(c => [c.props.id, c.props.width, c.props.align]),
      [
        ['hb-inline-col-left', '2fr', 'start'],
        ['hb-inline-col-center', '1fr', 'center'],
        ['hb-inline-col-right', '1fr', 'end'],
      ]
    );
    assert.equal(cols[0].props.content[0].props.id, 'l1');

    // Idempotent
    assert.equal(migrateInlineColumns(migrated), migrated);
  });

  it('migrates BuilderDocument node.slots and keeps extra-slot content as hidden Columns', () => {
    const legacyDoc: BuilderDocument = {
      version: DOCUMENT_VERSION,
      root: { props: {} },
      rootSlot: ['cols-doc', 'hb-split'],
      nodes: {
        'cols-doc': {
          id: 'cols-doc',
          type: 'Columns',
          props: { layout: '1-1' },
          slots: {
            column1: ['txt-1'],
            column2: ['txt-2'],
            column3: ['txt-hidden'],
            column4: [],
          },
        },
        'hb-split': {
          id: 'hb-split',
          type: 'HeaderBar',
          props: { layout: 'split-2' },
          slots: {
            left: ['logo-1'],
            center: ['nav-hidden'],
            right: ['btn-1'],
          },
        },
        'txt-1': { id: 'txt-1', type: 'RichText', props: {}, slots: {} },
        'txt-2': { id: 'txt-2', type: 'RichText', props: {}, slots: {} },
        'txt-hidden': { id: 'txt-hidden', type: 'RichText', props: {}, slots: {} },
        'logo-1': { id: 'logo-1', type: 'Logo', props: {}, slots: {} },
        'nav-hidden': { id: 'nav-hidden', type: 'Navigation', props: {}, slots: {} },
        'btn-1': { id: 'btn-1', type: 'Button', props: {}, slots: {} },
      },
    };

    const migrated = migrateDocumentColumns(legacyDoc);

    // cols-doc: 2 active columns + 1 hidden column (column3 had content; column4 was empty so omitted)
    assert.deepEqual(migrated.nodes['cols-doc'].slots.columns, [
      'cols-doc-col-column1',
      'cols-doc-col-column2',
      'cols-doc-col-column3',
    ]);
    assert.equal(migrated.nodes['cols-doc-col-column1'].meta?.hidden, undefined);
    assert.equal(migrated.nodes['cols-doc-col-column2'].meta?.hidden, undefined);
    assert.equal(migrated.nodes['cols-doc-col-column3'].meta?.hidden, true);
    assert.deepEqual(migrated.nodes['cols-doc-col-column3'].slots.content, [
      'txt-hidden',
    ]);

    // hb-split: left (active), center (hidden because split-2 has 2 columns), right (active)
    assert.deepEqual(migrated.nodes['hb-split'].slots.columns, [
      'hb-split-col-left',
      'hb-split-col-center',
      'hb-split-col-right',
    ]);
    assert.equal(migrated.nodes['hb-split-col-left'].meta?.hidden, undefined);
    assert.equal(migrated.nodes['hb-split-col-center'].meta?.hidden, true);
    assert.deepEqual(migrated.nodes['hb-split-col-center'].slots.content, [
      'nav-hidden',
    ]);
    assert.equal(migrated.nodes['hb-split-col-right'].meta?.hidden, undefined);

    // Idempotent
    assert.equal(migrateDocumentColumns(migrated), migrated);
  });

  it('normalizes BuilderDocument in normalizeContent and normalizeGlobalContent without data loss', () => {
    const legacyDoc: BuilderDocument = {
      version: DOCUMENT_VERSION,
      root: { props: { maxWidth: 'xl' } },
      rootSlot: ['cols-1'],
      nodes: {
        'cols-1': {
          id: 'cols-1',
          type: 'Columns',
          props: { layout: '1-2' },
          slots: { column1: ['h-1'], column2: ['h-2'] },
        },
        'h-1': { id: 'h-1', type: 'Heading', props: { text: 'One' }, slots: {} },
        'h-2': { id: 'h-2', type: 'Heading', props: { text: 'Two' }, slots: {} },
      },
    };

    const puck = normalizeContent('builder', legacyDoc) as PuckData;
    assert.equal(puck.content.length, 1);
    assert.equal(puck.content[0].type, 'Columns');
    const colZone = puck.zones?.['cols-1:columns'] ?? [];
    assert.equal(colZone.length, 2);
    assert.equal(colZone[0].props.width, '1fr');
    assert.equal(colZone[1].props.width, '2fr');

    const globalDoc = toDocument(normalizeGlobalContent(legacyDoc));
    assert.deepEqual(globalDoc.nodes['cols-1'].slots.columns, [
      'cols-1-col-column1',
      'cols-1-col-column2',
    ]);
  });
});

describe('Stage 2: Placement rules, store commands, and mega-menu rules', () => {
  it('rejects Column outside a column parent and allows it only in columns slots', () => {
    const { schemas } = editorSetup('page');
    const store = createEditorStore({
      schemas,
      document: {
        version: DOCUMENT_VERSION,
        root: { props: {} },
        rootSlot: ['cols-1', 'ctr-1'],
        nodes: {
          'cols-1': {
            id: 'cols-1',
            type: 'Columns',
            props: { layout: '1-1' },
            slots: { columns: ['col-1', 'col-2'] },
          },
          'col-1': {
            id: 'col-1',
            type: 'Column',
            props: { width: 'fill' },
            slots: { content: [] },
          },
          'col-2': {
            id: 'col-2',
            type: 'Column',
            props: { width: 'fill' },
            slots: { content: [] },
          },
          'ctr-1': {
            id: 'ctr-1',
            type: 'Container',
            props: {},
            slots: { content: [] },
          },
        },
      },
    });

    const doc = store.getState().doc;
    // Column cannot be placed at root, inside Container.content, or inside Column.content
    assert.equal(
      canPlace(doc, schemas, 'Column', { parentId: null, slot: 'root' }),
      false
    );
    assert.equal(
      canPlace(doc, schemas, 'Column', { parentId: 'ctr-1', slot: 'content' }),
      false
    );
    assert.equal(
      canPlace(doc, schemas, 'Column', { parentId: 'col-1', slot: 'content' }),
      false
    );
    // Column can be placed inside Columns.columns
    assert.equal(
      canPlace(doc, schemas, 'Column', { parentId: 'cols-1', slot: 'columns' }),
      true
    );
    // Non-Column cannot be placed directly in Columns.columns
    assert.equal(
      canPlace(doc, schemas, 'Heading', { parentId: 'cols-1', slot: 'columns' }),
      false
    );
  });

  it('prevents deleting the last Column, keeps duplicate in the same parent, disables wrap for Column, and filters quick insert', () => {
    const { schemas, groups } = editorSetup('header');
    const store = createEditorStore({
      schemas,
      document: {
        version: DOCUMENT_VERSION,
        root: { props: {} },
        rootSlot: ['hb-1'],
        nodes: {
          'hb-1': {
            id: 'hb-1',
            type: 'HeaderBar',
            props: { layout: 'split-2' },
            slots: { columns: ['col-1', 'col-2'] },
          },
          'col-1': {
            id: 'col-1',
            type: 'Column',
            props: { width: 'fill' },
            slots: { content: [] },
          },
          'col-2': {
            id: 'col-2',
            type: 'Column',
            props: { width: 'auto' },
            slots: { content: [] },
          },
        },
      },
    });

    // Wrap ("Group in a container") is unavailable for Column
    assert.equal(store.wrap('Container', ['col-1']), null);

    // Quick insert in `columns` slot offers only Column
    const qiItems = quickInsertItemsForSlot(store, groups, {
      parentId: 'hb-1',
      slot: 'columns',
      index: 0,
    });
    assert.deepEqual(
      qiItems.map(i => i.id),
      ['Column']
    );

    // Duplicate stays in the same parent
    store.duplicate(['col-1']);
    assert.equal(store.getState().doc.nodes['hb-1'].slots.columns.length, 3);

    // Can delete down to 1 Column, but cannot delete the last Column
    const colsNow = store.getState().doc.nodes['hb-1'].slots.columns;
    assert.equal(store.canRemove([colsNow[0]]), true);
    store.remove([colsNow[0]]);
    assert.equal(store.getState().doc.nodes['hb-1'].slots.columns.length, 2);

    const colsTwo = store.getState().doc.nodes['hb-1'].slots.columns;
    assert.equal(store.canRemove([colsTwo[0]]), true);
    store.remove([colsTwo[0]]);
    assert.equal(store.getState().doc.nodes['hb-1'].slots.columns.length, 1);

    const lastCol = store.getState().doc.nodes['hb-1'].slots.columns[0];
    assert.equal(store.canRemove([lastCol]), false);
    assert.equal(store.remove([lastCol]), false);
    assert.deepEqual(store.getState().doc.nodes['hb-1'].slots.columns, [lastCol]);
  });

  it('syncs Column children when layout or columns inspector controls change, and lists Column in Layers', () => {
    const { schemas } = editorSetup('page');
    const store = createEditorStore({
      schemas,
      document: {
        version: DOCUMENT_VERSION,
        root: { props: {} },
        rootSlot: [],
        nodes: {},
      },
    });

    // Inserting Columns creates 2 default Column children
    const colsId = store.insertBlock('Columns')!;
    assert.ok(colsId);
    const initialCols = store.getState().doc.nodes[colsId].slots.columns;
    assert.equal(initialCols.length, 2);

    // Put a Heading inside the 2nd column, switch to 1-1-1, then back to 1-1
    store.insertBlock('Heading', {
      parentId: initialCols[1],
      slot: 'content',
      index: 0,
    });
    store.updateProps(colsId, { layout: '1-1-1' });
    const threeCols = store.getState().doc.nodes[colsId].slots.columns;
    assert.equal(threeCols.length, 3);

    // Add a Heading in the 3rd column, then switch layout back to 2-1:
    // the 3rd column has content so it is kept hidden rather than deleted!
    store.insertBlock('Heading', {
      parentId: threeCols[2],
      slot: 'content',
      index: 0,
    });
    store.updateProps(colsId, { layout: '2-1' });
    const afterTwoOne = store.getState().doc.nodes[colsId].slots.columns;
    assert.equal(afterTwoOne.length, 3);
    assert.equal(
      store.getState().doc.nodes[afterTwoOne[0]].props.width,
      '2fr'
    );
    assert.equal(
      store.getState().doc.nodes[afterTwoOne[1]].props.width,
      '1fr'
    );
    assert.equal(
      store.getState().doc.nodes[afterTwoOne[2]].meta?.hidden,
      true
    );

    // Layers tree lists Column entries directly under Columns without id::slot group headings
    const tree = layerNodes(
      store.getState().doc,
      type => schemas[type]?.label ?? type
    );
    assert.equal(tree[0].id, colsId);
    assert.deepEqual(
      tree[0].children?.map(c => [c.type, !!c.group]),
      [
        ['Column', false],
        ['Column', false],
        ['Column', false],
      ]
    );
  });

  it('megaMenuEditorSetup keeps Column in columns slots and applies the allow-list to Column.content', () => {
    const { schemas } = editorSetup('mega-menu');
    const doc: BuilderDocument = {
      version: DOCUMENT_VERSION,
      root: { props: {} },
      rootSlot: ['cols-1'],
      nodes: {
        'cols-1': {
          id: 'cols-1',
          type: 'Columns',
          props: { layout: '1-1' },
          slots: { columns: ['col-1'] },
        },
        'col-1': {
          id: 'col-1',
          type: 'Column',
          props: { width: 'fill' },
          slots: { content: [] },
        },
      },
    };

    // Columns.columns accepts Column
    assert.equal(
      canPlace(doc, schemas, 'Column', { parentId: 'cols-1', slot: 'columns' }),
      true
    );
    // Column.content accepts allowed mega-menu blocks (RichText, FooterLinks, Button, MegaMenuCard)
    assert.equal(
      canPlace(doc, schemas, 'RichText', { parentId: 'col-1', slot: 'content' }),
      true
    );
    assert.equal(
      canPlace(doc, schemas, 'FooterLinks', { parentId: 'col-1', slot: 'content' }),
      true
    );
    assert.equal(
      canPlace(doc, schemas, 'MegaMenuCard', { parentId: 'col-1', slot: 'content' }),
      true
    );
    // Column.content rejects blocks outside mega-menu allow list (Pricing, Hero, Column)
    assert.equal(
      canPlace(doc, schemas, 'Pricing', { parentId: 'col-1', slot: 'content' }),
      false
    );
    assert.equal(
      canPlace(doc, schemas, 'Column', { parentId: 'col-1', slot: 'content' }),
      false
    );
  });
});
