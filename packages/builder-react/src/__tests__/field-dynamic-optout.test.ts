import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fieldAllowsDynamic } from '../fields';

describe('fieldAllowsDynamic', () => {
  it('allows bindings on text-like fields by default', () => {
    assert.equal(fieldAllowsDynamic({ type: 'text', label: 'Title' } as never), true);
    assert.equal(fieldAllowsDynamic({ type: 'image', label: 'Image' } as never), true);
  });

  it('lets a text field opt out with dynamic: false (e.g. a CSS selector)', () => {
    assert.equal(fieldAllowsDynamic({ type: 'text', label: 'Selector', dynamic: false } as never), false);
  });

  it('still lets other field types opt in with dynamic: true', () => {
    assert.equal(fieldAllowsDynamic({ type: 'number', label: 'N', dynamic: true } as never), true);
    assert.equal(fieldAllowsDynamic({ type: 'number', label: 'N' } as never), false);
  });
});
