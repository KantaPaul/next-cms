import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cn } from '../lib/cn';

describe('editor-ui primitives (B15 E1)', () => {
  it('merges class names without duplicates', () => {
    assert.equal(cn('px-2', 'px-4'), 'px-4');
    assert.equal(cn('text-sm', 'font-bold'), 'text-sm font-bold');
  });

  it('handles conditional classes', () => {
    assert.equal(cn('base', false && 'hidden', 'visible'), 'base visible');
  });

  it('handles undefined and null gracefully', () => {
    assert.equal(cn(undefined, null, 'foo'), 'foo');
  });
});
