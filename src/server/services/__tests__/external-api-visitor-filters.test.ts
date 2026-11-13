import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  encodeExtRange,
  encodeExtSearch,
  formatExtValue,
  matchesExtFilter,
  parseExtValue,
  readExtRange,
  readExtSearch,
} from '@/lib/external-api-visitor-filters';

const product = {
  title: 'Mens Cotton Jacket',
  category: "men's clothing",
  price: 55.99,
  tags: ['winter', 'Sale'],
  rating: { rate: 4.7, count: 500 },
  inStock: true,
};

describe('External API visitor filters', () => {
  it('encodes and parses each value kind', () => {
    assert.deepEqual(parseExtValue('electronics'), { kind: 'in', value: 'electronics' });
    assert.deepEqual(parseExtValue(encodeExtSearch('  shirt ')), { kind: 'contains', value: 'shirt' });
    assert.deepEqual(parseExtValue(encodeExtRange('10', '50')), { kind: 'range', min: 10, max: 50 });
    assert.deepEqual(parseExtValue('10..'), { kind: 'range', min: 10 });
    assert.deepEqual(parseExtValue('..2.5'), { kind: 'range', max: 2.5 });
    assert.equal(encodeExtRange('', ''), '');
    assert.equal(encodeExtRange('abc', '5'), '');
    assert.equal(encodeExtSearch('   '), '');
  });

  it('matches one-of values, including array elements, case-insensitively', () => {
    assert.equal(matchesExtFilter(product, 'category', ["men's clothing", 'jewelery']), true);
    assert.equal(matchesExtFilter(product, 'category', ['jewelery']), false);
    assert.equal(matchesExtFilter(product, 'tags', ['sale']), true);
    assert.equal(matchesExtFilter(product, 'inStock', ['true']), true);
  });

  it('matches text search and inclusive number ranges, nested keys too', () => {
    assert.equal(matchesExtFilter(product, 'title', ['~cotton']), true);
    assert.equal(matchesExtFilter(product, 'title', ['~silk']), false);
    assert.equal(matchesExtFilter(product, 'price', ['50..55.99']), true);
    assert.equal(matchesExtFilter(product, 'price', ['56..']), false);
    assert.equal(matchesExtFilter(product, 'rating.rate', ['4.5..']), true);
    assert.equal(matchesExtFilter(product, 'rating.count', ['..100']), false);
    assert.equal(matchesExtFilter(product, 'title', ['10..20']), false);
  });

  it('formats chips and prefills inputs', () => {
    assert.equal(formatExtValue('~shirt'), '“shirt”');
    assert.equal(formatExtValue('10..50'), '10 – 50');
    assert.equal(formatExtValue('10..'), '≥ 10');
    assert.equal(formatExtValue('..50'), '≤ 50');
    assert.equal(formatExtValue('electronics'), 'electronics');
    assert.deepEqual(readExtRange(['5..9']), { min: '5', max: '9' });
    assert.equal(readExtSearch(['~bag']), 'bag');
  });
});
