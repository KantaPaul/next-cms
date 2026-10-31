import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALLOWED_FILTER_FIELDS,
  ALLOWED_SORT_FIELDS,
  formatNamespacedParam,
  listingQuerySchema,
  MAX_PAGE_SIZE,
  parseNamespacedParams,
  encodeNamespacedParams,
} from '@nextcms/builder-core';

describe('Query foundation & boundaries (R571, R572, R573 / QRY-01–03)', () => {
  it('enforces hard maximum limit of 100 items', () => {
    assert.equal(MAX_PAGE_SIZE, 100);

    const parsed = listingQuerySchema.parse({
      source: 'posts',
      limit: 100,
    });
    assert.equal(parsed.limit, 100);

    assert.throws(() => {
      listingQuerySchema.parse({
        source: 'posts',
        limit: 101,
      });
    }, /too_big/);
  });

  it('validates allowlisted filters per source (posts, pages, collection-entries, videos)', () => {
    assert.ok(ALLOWED_FILTER_FIELDS.posts.includes('categories'));
    assert.ok(ALLOWED_FILTER_FIELDS.posts.includes('tags'));
    assert.ok(ALLOWED_FILTER_FIELDS.posts.includes('authorId'));
    assert.ok(ALLOWED_FILTER_FIELDS.posts.includes('search'));

    assert.ok(ALLOWED_FILTER_FIELDS.videos.includes('playlistId'));
    assert.ok(ALLOWED_FILTER_FIELDS.videos.includes('provider'));

    assert.ok(ALLOWED_FILTER_FIELDS['collection-entries'].includes('collectionId'));

    // Rejects non-allowlisted column injection
    assert.throws(() => {
      listingQuerySchema.parse({
        source: 'posts',
        filters: [{ field: 'passwordHash', operator: 'eq', value: 'secret' }],
      });
    }, /Filter field 'passwordHash' is not allowed for source 'posts'/);
  });

  it('validates allowlisted sort fields per source', () => {
    assert.ok(ALLOWED_SORT_FIELDS.posts.includes('publishedAt'));
    assert.ok(ALLOWED_SORT_FIELDS.posts.includes('title'));
    assert.ok(ALLOWED_SORT_FIELDS.videos.includes('position'));

    assert.throws(() => {
      listingQuerySchema.parse({
        source: 'videos',
        sortField: 'salary',
      });
    }, /Sort field 'salary' is not allowed for source 'videos'/);
  });

  it('handles excludeCurrent and currentId parameters safely', () => {
    const config = listingQuerySchema.parse({
      source: 'posts',
      excludeCurrent: true,
      currentId: 'current-post-id',
    });
    assert.equal(config.excludeCurrent, true);
    assert.equal(config.currentId, 'current-post-id');
  });

  it('prevents parameter collision between multiple listings on the same page (R573)', () => {
    const multiBlockUrlParams = {
      // Feed A
      blog_page: '3',
      blog_q: 'design',
      blog_category: 'architecture',

      // Feed B
      video_page: '1',
      video_sort: 'duration',
      video_order: 'asc',
    };

    const blogParams = parseNamespacedParams(multiBlockUrlParams, 'blog');
    assert.equal(blogParams.page, 3);
    assert.equal(blogParams.search, 'design');
    assert.equal(blogParams.category, 'architecture');
    assert.equal(blogParams.sort, undefined);

    const videoParams = parseNamespacedParams(multiBlockUrlParams, 'video');
    assert.equal(videoParams.page, 1);
    assert.equal(videoParams.search, undefined);
    assert.equal(videoParams.sort, 'duration');
    assert.equal(videoParams.order, 'asc');

    // Encoding works reversibly
    const encoded = encodeNamespacedParams(blogParams, 'blog');
    assert.equal(encoded.blog_page, '3');
    assert.equal(encoded.blog_q, 'design');
    assert.equal(encoded.blog_category, 'architecture');
  });
});
