import assert from 'node:assert';
import { describe, it } from 'node:test';
import { fieldSortKey, listingQuerySchema } from '../query';

describe('listing query field filters', () => {
  it('accepts custom-field filters and field sorts for collection entries', () => {
    const q = listingQuerySchema.parse({
      source: 'collection-entries',
      collectionId: 'c1',
      fieldFilters: [
        { key: 'price', operator: 'gte', value: 10 },
        { key: 'featured', operator: 'exists' },
      ],
      sortField: 'field:price',
    });
    assert.equal(q.fieldFilters.length, 2);
    assert.equal(q.sortField, 'field:price');
  });

  it('defaults fieldFilters to an empty list', () => {
    const q = listingQuerySchema.parse({ source: 'posts' });
    assert.deepEqual(q.fieldFilters, []);
  });

  it('rejects field filters and field sorts on other sources', () => {
    assert.throws(() =>
      listingQuerySchema.parse({
        source: 'posts',
        fieldFilters: [{ key: 'price', operator: 'eq', value: 1 }],
      })
    );
    assert.throws(() =>
      listingQuerySchema.parse({ source: 'posts', sortField: 'field:price' })
    );
  });

  it('rejects unsafe field keys', () => {
    assert.throws(() =>
      listingQuerySchema.parse({
        source: 'collection-entries',
        collectionId: 'c1',
        fieldFilters: [{ key: "x'); drop table", operator: 'eq', value: 1 }],
      })
    );
    assert.equal(fieldSortKey("field:a'b"), null);
    assert.equal(fieldSortKey('publishedAt'), null);
    assert.equal(fieldSortKey('field:price_2'), 'price_2');
  });
});
