import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALLOWED_FILTER_FIELDS,
  ALLOWED_SORT_FIELDS,
  encodeNamespacedParams,
  formatNamespacedParam,
  LISTING_SOURCES,
  listingQuerySchema,
  MAX_PAGE_SIZE,
  parseNamespacedParams,
} from '../query';

describe('Query foundation schema & validation (R571 / QRY-01)', () => {
  it('defines the approved listing sources', () => {
    assert.deepEqual(LISTING_SOURCES, [
      'posts',
      'pages',
      'collection-entries',
      'videos',
    ]);
  });

  it('validates a valid posts query', () => {
    const valid = listingQuerySchema.parse({
      source: 'posts',
      filters: [
        { field: 'categories', operator: 'in', value: ['tech', 'news'] },
        { field: 'search', operator: 'contains', value: 'hello' },
      ],
      sortField: 'publishedAt',
      sortOrder: 'desc',
      limit: 12,
      page: 2,
    });
    assert.equal(valid.source, 'posts');
    assert.equal(valid.limit, 12);
    assert.equal(valid.page, 2);
    assert.equal(valid.sortField, 'publishedAt');
  });

  it('clamps limit to MAX_PAGE_SIZE (100) or rejects out-of-range limits', () => {
    assert.throws(
      () =>
        listingQuerySchema.parse({
          source: 'posts',
          limit: 150,
        }),
      /too_big/
    );

    assert.throws(
      () =>
        listingQuerySchema.parse({
          source: 'posts',
          limit: 0,
        }),
      /too_small/
    );
  });

  it('rejects unallowlisted filter fields for a given source', () => {
    assert.throws(
      () =>
        listingQuerySchema.parse({
          source: 'posts',
          filters: [{ field: 'disallowed_column', operator: 'eq', value: '1' }],
        }),
      /Filter field 'disallowed_column' is not allowed for source 'posts'/
    );
  });

  it('rejects unallowlisted sort fields for a given source', () => {
    assert.throws(
      () =>
        listingQuerySchema.parse({
          source: 'videos',
          sortField: 'someUnknownField',
        }),
      /Sort field 'someUnknownField' is not allowed for source 'videos'/
    );
  });

  it('requires collectionId when source is collection-entries', () => {
    assert.throws(
      () =>
        listingQuerySchema.parse({
          source: 'collection-entries',
        }),
      /collectionId is required when source is collection-entries/
    );

    const valid = listingQuerySchema.parse({
      source: 'collection-entries',
      collectionId: 'col-123',
    });
    assert.equal(valid.collectionId, 'col-123');
  });
});

describe('Namespaced URL parameters (R573 / QRY-03)', () => {
  it('formats parameter names with or without namespace', () => {
    assert.equal(formatNamespacedParam('page', null), 'page');
    assert.equal(formatNamespacedParam('page', undefined), 'page');
    assert.equal(formatNamespacedParam('page', 'feed'), 'feed_page');
    assert.equal(formatNamespacedParam('category', 'vids'), 'vids_category');
  });

  it('parses un-namespaced query parameters', () => {
    const parsed = parseNamespacedParams({
      page: '3',
      q: 'react',
      category: 'guides',
      sort: 'title',
      order: 'asc',
    });
    assert.equal(parsed.page, 3);
    assert.equal(parsed.search, 'react');
    assert.equal(parsed.category, 'guides');
    assert.equal(parsed.sort, 'title');
    assert.equal(parsed.order, 'asc');
  });

  it('parses namespaced query parameters and isolates blocks on the same page', () => {
    const rawUrlParams = {
      // Block A (feed1)
      feed1_page: '2',
      feed1_q: 'nextjs',
      feed1_category: 'tutorials',

      // Block B (feed2)
      feed2_page: '5',
      feed2_sort: 'publishedAt',
      feed2_order: 'desc',
    };

    const blockA = parseNamespacedParams(rawUrlParams, 'feed1');
    assert.equal(blockA.page, 2);
    assert.equal(blockA.search, 'nextjs');
    assert.equal(blockA.category, 'tutorials');
    assert.equal(blockA.sort, undefined);

    const blockB = parseNamespacedParams(rawUrlParams, 'feed2');
    assert.equal(blockB.page, 5);
    assert.equal(blockB.search, undefined);
    assert.equal(blockB.sort, 'publishedAt');
    assert.equal(blockB.order, 'desc');
  });

  it('encodes namespaced parameters cleanly', () => {
    const encoded = encodeNamespacedParams(
      {
        page: 3,
        search: 'cms',
        category: 'tech',
      },
      'myBlock'
    );
    assert.deepEqual(encoded, {
      myBlock_page: '3',
      myBlock_q: 'cms',
      myBlock_category: 'tech',
    });
  });
});
