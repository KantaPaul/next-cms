import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  allowsCssContent,
  collectUsedClassIds,
  isSafeClassName,
  styleClassNameFor,
  formatVariantKey,
  isValidNthChild,
  isValidState,
  parseVariantKey,
  stateSelectorSuffix,
} from '../style-classes';

describe('Style classes', () => {
  describe('parseVariantKey / formatVariantKey', () => {
    it('round-trips a plain device key', () => {
      const key = formatVariantKey('desktop', null);
      assert.equal(key, 'desktop');
      assert.deepEqual(parseVariantKey(key), { device: 'desktop', state: null });
    });

    it('round-trips a device with a state', () => {
      const key = formatVariantKey('tablet', 'hover');
      assert.equal(key, 'tablet:hover');
      assert.deepEqual(parseVariantKey(key), { device: 'tablet', state: 'hover' });
    });

    it('keeps pseudo-element states intact after the separator', () => {
      const key = formatVariantKey('mobile', 'hover:before');
      assert.equal(key, 'mobile:hover:before');
      assert.deepEqual(parseVariantKey(key), { device: 'mobile', state: 'hover:before' });
    });

    it('parses a before/after pseudo-element', () => {
      assert.deepEqual(parseVariantKey('tablet:before'), { device: 'tablet', state: 'before' });
      assert.deepEqual(parseVariantKey('mobile:after'), { device: 'mobile', state: 'after' });
    });
  });

  describe('stateSelectorSuffix', () => {
    it('maps known states to CSS pseudo selectors', () => {
      assert.equal(stateSelectorSuffix(null), '');
      assert.equal(stateSelectorSuffix('hover'), ':hover');
      assert.equal(stateSelectorSuffix('focus-visible'), ':focus-visible');
      assert.equal(stateSelectorSuffix('before'), '::before');
      assert.equal(stateSelectorSuffix('after'), '::after');
      assert.equal(stateSelectorSuffix('first-child'), ':first-child');
    });

    it('combines a pseudo-class and pseudo-element', () => {
      assert.equal(stateSelectorSuffix('hover:before'), ':hover::before');
    });

    it('passes through nth-child formulas', () => {
      assert.equal(stateSelectorSuffix('nth-child(2n)'), ':nth-child(2n)');
    });
  });

  describe('isValidNthChild', () => {
    it('accepts valid formulas', () => {
      assert.ok(isValidNthChild('odd'));
      assert.ok(isValidNthChild('even'));
      assert.ok(isValidNthChild('2n'));
      assert.ok(isValidNthChild('2n+1'));
      assert.ok(isValidNthChild('-n+3'));
      assert.ok(isValidNthChild('n'));
      assert.ok(isValidNthChild('5n-2'));
    });

    it('rejects invalid formulas', () => {
      assert.ok(!isValidNthChild('abc'));
      assert.ok(!isValidNthChild('2n + 1'));
      assert.ok(!isValidNthChild('nth-child(2n)'));
      assert.ok(!isValidNthChild(''));
    });
  });

  describe('isValidState (KRK-01 safety)', () => {
    it('accepts no state, known states, combos and valid nth-child', () => {
      assert.ok(isValidState(null));
      assert.ok(isValidState('hover'));
      assert.ok(isValidState('hover:before'));
      assert.ok(isValidState('nth-child(2n+1)'));
      assert.ok(isValidState('nth-child(odd):hover'));
    });

    it('rejects unknown states instead of dropping them', () => {
      assert.ok(!isValidState('bogus'));
      assert.ok(!isValidState('hover:bogus'));
      assert.ok(!isValidState(''));
      assert.equal(stateSelectorSuffix('bogus'), null);
    });

    it('rejects nth-child formulas that would inject selectors', () => {
      assert.ok(!isValidState('nth-child(1),body *,a(1)'));
      assert.ok(!isValidState('nth-child(1){}body{x}'));
      assert.equal(stateSelectorSuffix('nth-child(1),body *,a(1)'), null);
    });

    it('requires a pseudo-element to be the last part', () => {
      assert.ok(!isValidState('before:hover'));
      assert.ok(!isValidState('before:after'));
    });
  });

  describe('allowsCssContent', () => {
    it('allows content only on ::before and ::after', () => {
      assert.ok(allowsCssContent('before'));
      assert.ok(allowsCssContent('hover:after'));
      assert.ok(!allowsCssContent('placeholder'));
      assert.ok(!allowsCssContent('hover'));
      assert.ok(!allowsCssContent(null));
    });
  });

  describe('collectUsedClassIds', () => {
    it('collects ids from nodes, nested loaded data and Puck props', () => {
      const resolved = {
        nodes: {
          a: { id: 'a', props: { classIds: ['card', 'is-large'] } },
          g: {
            id: 'g',
            props: { data: { nodes: { inner: { id: 'inner', props: { classIds: ['footer-cta'] } } } } },
          },
        },
        content: [{ props: { id: 'p', classIds: ['card', '', 3] } }],
      };
      assert.deepEqual([...collectUsedClassIds(resolved)].sort(), ['card', 'footer-cta', 'is-large']);
      assert.equal(collectUsedClassIds(null).size, 0);
    });
  });

  describe('styleClassNameFor', () => {
    const classes = { a: { name: 'card' }, b: { name: 'is-large' }, bad: { name: 'x y' } };

    it('maps ids to c-<name> in order, skipping unknown and unsafe ones', () => {
      assert.equal(styleClassNameFor(['a', 'missing', 'bad', 'b', 'a'], classes), 'c-card c-is-large');
      assert.equal(styleClassNameFor(['missing'], classes), '');
      assert.equal(styleClassNameFor('a', classes), '');
      assert.equal(styleClassNameFor(['a'], undefined), '');
    });

    it('accepts only schema-safe names', () => {
      assert.ok(isSafeClassName('card-2'));
      assert.ok(!isSafeClassName('Card'));
      assert.ok(!isSafeClassName('a"b'));
      assert.ok(!isSafeClassName(undefined));
    });
  });
});
