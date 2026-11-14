import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { APPROVED_DYNAMIC_SOURCES } from '../dynamic';
import { CURRENT_ITEM_REF, resolveDynamicValue } from '../dynamic-resolver';

const binding = (path: string, ref?: string, fallback?: string) => ({
  $dynamic: 'externalApi',
  path,
  ...(ref ? { ref } : {}),
  ...(fallback !== undefined ? { fallback } : {}),
});

const products = { 'preset-1': { title: 'Backpack', price: 109.95, rating: { rate: 3.9 } } };
const clicked = { title: 'Jacket', price: 55.99, rating: { rate: 4.7 } };

describe('External API Item bindings', () => {
  it('is an approved source that picks a saved preset', () => {
    assert.equal(APPROVED_DYNAMIC_SOURCES.externalApi.pick, 'externalApi');
  });

  it('reads the preset record by ref, including nested paths', () => {
    assert.equal(resolveDynamicValue(binding('title', 'preset-1'), { externalApi: products }), 'Backpack');
    assert.equal(resolveDynamicValue(binding('rating.rate', 'preset-1'), { externalApi: products }), 3.9);
  });

  it('uses the current item (*) when it has no record for the ref', () => {
    const ctx = { externalApi: { [CURRENT_ITEM_REF]: clicked } };
    assert.equal(resolveDynamicValue(binding('title', 'preset-1'), ctx), 'Jacket');
    assert.equal(resolveDynamicValue(binding('price'), ctx), 55.99);
  });

  it('prefers the preset record over the current item when both exist', () => {
    const ctx = { externalApi: { ...products, [CURRENT_ITEM_REF]: clicked } };
    assert.equal(resolveDynamicValue(binding('title', 'preset-1'), ctx), 'Backpack');
  });

  it('falls back when nothing matches', () => {
    assert.equal(resolveDynamicValue(binding('title', 'other', 'n/a'), { externalApi: products }), 'n/a');
  });

  it('keeps deferred bindings intact until a later pass', () => {
    const b = binding('title', 'preset-1');
    assert.deepEqual(resolveDynamicValue(b, { preserveSources: ['externalApi'] }), b);
  });

  it('keeps "current item" bindings for the card or popup that supplies it', () => {
    const b = binding('title');
    assert.deepEqual(resolveDynamicValue(b, { preserveLoopBindings: true, externalApi: products }), b);
    assert.equal(
      resolveDynamicValue(b, { preserveLoopBindings: true, externalApi: { [CURRENT_ITEM_REF]: clicked } }),
      'Jacket'
    );
  });

  it('never returns the record map itself (no ref, no path, no current item)', () => {
    assert.equal(resolveDynamicValue(binding(''), { externalApi: products }), '');
    assert.equal(resolveDynamicValue(binding('', 'preset-1', 'x'), { externalApi: products }), 'x');
    assert.equal(
      resolveDynamicValue({ $dynamic: 'pageRef', path: 'title' }, { pageRef: { a: { title: 'A' } } }),
      ''
    );
  });
});
