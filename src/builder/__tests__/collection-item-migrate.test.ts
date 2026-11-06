import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BuilderDocument } from '@nextcms/builder-core';
import { migrateCollectionItems } from '../collection-item-migrate';

const doc = (props: Record<string, unknown>): BuilderDocument =>
  ({
    version: 1,
    root: { props: {} },
    nodes: { a: { id: 'a', type: 'CollectionItem', props, slots: {} } },
    children: ['a'],
  }) as unknown as BuilderDocument;

describe('migrateCollectionItems', () => {
  it('turns a single legacy field into a one-row list', () => {
    const out = migrateCollectionItems(
      doc({ field: 'role', textSize: 'h3', showLabel: false, layout: 'clean' })
    );
    const props = out.nodes.a.props as Record<string, any>;
    assert.equal(props.field, undefined);
    assert.equal(props.layout, 'clean');
    assert.deepEqual(props.items, [
      {
        field: 'role',
        textSize: 'h3',
        showLabel: false,
        labelText: '',
        style: {},
        labelStyle: {},
      },
    ]);
  });

  it('leaves blocks that already have items, or no field, untouched', () => {
    const withItems = doc({ items: [{ field: 'name' }], field: 'role' });
    assert.equal(migrateCollectionItems(withItems), withItems);
    const empty = doc({ field: '' });
    assert.equal(migrateCollectionItems(empty), empty);
  });
});
