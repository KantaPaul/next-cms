import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Button } from '../primitives/Button';

describe('editor-ui Button (B15 E1)', () => {
  it('exports Button component', () => {
    assert.ok(Button);
    assert.equal(typeof Button, 'object'); // forwardRef returns an object
  });
});
