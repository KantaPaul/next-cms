import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectLoopBlocks,
  findTargetLoop,
  INHERITED_TEMPLATE_KEY,
  inheritTargetLoopApi,
  resolveFilterProps,
} from '../query-filter-target';

const usersGrid = {
  id: 'LoopGrid-users',
  type: 'LoopGrid',
  props: {
    loopId: '',
    source: 'external-api',
    apiPresetId: 'preset-users',
    apiEndpointUrl: 'https://jsonplaceholder.typicode.com/users',
    apiItemsPath: '',
    apiFieldTitle: 'name',
  },
};
const productsGrid = {
  id: 'LoopGrid-products',
  type: 'LoopGrid',
  props: {
    loopId: 'shop',
    source: 'external-api',
    apiPresetId: 'preset-products',
    apiEndpointUrl: 'https://fakestoreapi.com/products',
  },
};
const postsLoop = {
  id: 'QueryLoop-posts',
  type: 'QueryLoop',
  props: { loopId: '', source: 'posts' },
};
const nodes = {
  [postsLoop.id]: postsLoop,
  [usersGrid.id]: usersGrid,
  [productsGrid.id]: productsGrid,
  'Heading-1': { id: 'Heading-1', type: 'Heading', props: {} },
};

describe('Query Filter target loop', () => {
  const loops = collectLoopBlocks(nodes);

  it('collects only Query Loop and Loop Grid blocks', () => {
    assert.deepEqual(
      loops.map(l => l.id),
      ['QueryLoop-posts', 'LoopGrid-users', 'LoopGrid-products']
    );
  });

  it('matches by loopId, preferring a loop with the same source', () => {
    assert.equal(
      findTargetLoop(loops, { targetLoopId: '', source: 'external-api' })?.id,
      'LoopGrid-users'
    );
    assert.equal(
      findTargetLoop(loops, { targetLoopId: '', source: 'posts' })?.id,
      'QueryLoop-posts'
    );
    assert.equal(
      findTargetLoop(loops, { targetLoopId: ' shop ', source: 'external-api' })?.id,
      'LoopGrid-products'
    );
    assert.equal(findTargetLoop(loops, { targetLoopId: 'missing' }), undefined);
  });

  it('copies the target loop API onto a filter with none of its own', () => {
    const filter = { source: 'external-api', targetLoopId: 'shop', apiFilterFields: [] };
    const merged = inheritTargetLoopApi(filter, findTargetLoop(loops, filter));
    assert.equal(merged.apiPresetId, 'preset-products');
    assert.equal(merged.apiEndpointUrl, 'https://fakestoreapi.com/products');
    assert.deepEqual(merged.apiFilterFields, []);
    assert.equal(merged.targetLoopId, 'shop');
  });

  it('keeps a filter that has its own API, or is not in External API mode', () => {
    const own = { source: 'external-api', apiPresetId: 'mine' };
    assert.equal(inheritTargetLoopApi(own, usersGrid), own);
    const posts = { source: 'posts' };
    assert.equal(inheritTargetLoopApi(posts, usersGrid), posts);
  });

  it('does not inherit from a loop that is not an External API loop', () => {
    const filter = { source: 'external-api' };
    assert.equal(inheritTargetLoopApi(filter, postsLoop), filter);
    assert.equal(inheritTargetLoopApi(filter, undefined), filter);
  });

  it('passes the Loop Item template when the grid gets its API from it', () => {
    const templated = {
      id: 'LoopGrid-t',
      type: 'LoopGrid',
      props: { source: 'external-api', templateId: 'tpl-1' },
    };
    const merged = inheritTargetLoopApi({ source: 'external-api' }, templated);
    assert.equal(merged[INHERITED_TEMPLATE_KEY], 'tpl-1');
    assert.equal(merged.apiPresetId, undefined);
  });

  it('links a filter with no target ID to the loop using its saved API', () => {
    const filter = { source: 'external-api', targetLoopId: '', apiPresetId: 'preset-products' };
    assert.equal(findTargetLoop(loops, filter)?.id, 'LoopGrid-products');
    const resolved = resolveFilterProps(filter, loops);
    assert.equal(resolved.targetLoopId, 'shop');
  });

  it('falls back to the only loop with the filter source', () => {
    const onlyProducts = collectLoopBlocks({ [productsGrid.id]: productsGrid, [postsLoop.id]: postsLoop });
    const filter = { source: 'external-api' };
    assert.equal(findTargetLoop(onlyProducts, filter)?.id, 'LoopGrid-products');
    assert.equal(resolveFilterProps(filter, onlyProducts).targetLoopId, 'shop');
  });

  it('keeps an explicit targetLoopId', () => {
    const filter = { source: 'external-api', targetLoopId: 'shop', apiPresetId: 'preset-users' };
    assert.equal(findTargetLoop(loops, filter)?.id, 'LoopGrid-products');
    assert.equal(resolveFilterProps(filter, loops), filter);
  });
});
