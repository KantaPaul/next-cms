import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  styleClassPatchSchema,
  styleClassSchema,
  styleClassVariantSchema,
} from '@/schemas/style-classes.schema';

describe('styleClassVariantSchema (KRK-01)', () => {
  it('accepts device and state keys with allowed CSS', () => {
    const result = styleClassVariantSchema.safeParse({
      desktop: { color: '#000' },
      'tablet:hover': { backgroundColor: '#fff' },
      'mobile:hover:before': { content: '"→"', color: '#f00' },
    });
    assert.ok(result.success, JSON.stringify(result.error?.issues));
  });

  it('rejects unknown states', () => {
    assert.ok(!styleClassVariantSchema.safeParse({ 'desktop:bogus': { color: '#000' } }).success);
  });

  it('rejects nth-child keys that would escape the scope', () => {
    const result = styleClassVariantSchema.safeParse({
      'desktop:nth-child(1),body *,a(1)': { display: 'none' },
    });
    assert.ok(!result.success);
  });

  it('allows content only on ::before and ::after', () => {
    assert.ok(!styleClassVariantSchema.safeParse({ desktop: { content: '"x"' } }).success);
    assert.ok(!styleClassVariantSchema.safeParse({ 'desktop:before': { content: 'url(x)' } }).success);
    assert.ok(styleClassVariantSchema.safeParse({ 'desktop:after': { content: 'none' } }).success);
  });

  it('accepts the class properties used for spacing and size', () => {
    const result = styleClassVariantSchema.safeParse({
      desktop: { padding: '12px', marginTop: '8px', width: '100%', opacity: '0.5' },
    });
    assert.ok(result.success, JSON.stringify(result.error?.issues));
  });
});

describe('styleClassSchema kind rules (KRK-01)', () => {
  it('requires a tag for tag styles and forbids it on classes', () => {
    assert.ok(styleClassSchema.safeParse({ name: 'h1', kind: 'tag', tag: 'h1' }).success);
    assert.ok(!styleClassSchema.safeParse({ name: 'h1', kind: 'tag' }).success);
    assert.ok(!styleClassSchema.safeParse({ name: 'card', kind: 'class', tag: 'div' }).success);
  });

  it('allows comboOf on classes only', () => {
    assert.ok(styleClassSchema.safeParse({ name: 'is-large', kind: 'class', comboOf: 'btn' }).success);
    assert.ok(!styleClassSchema.safeParse({ name: 'h1', kind: 'tag', tag: 'h1', comboOf: 'btn' }).success);
  });

  it('defaults variants to an empty object on create', () => {
    const parsed = styleClassSchema.parse({ name: 'card', kind: 'class' });
    assert.deepEqual(parsed.variants, {});
  });
});

describe('styleClassPatchSchema (KRK-01)', () => {
  it('does not reset variants on a rename', () => {
    assert.deepEqual(styleClassPatchSchema.parse({ name: 'card-2' }), { name: 'card-2' });
  });

  it('drops kind, tag and comboOf, which are fixed after creation', () => {
    assert.deepEqual(
      styleClassPatchSchema.parse({ name: 'card', kind: 'tag', tag: 'h1', comboOf: 'x' }),
      { name: 'card' }
    );
  });

  it('still validates names and variants', () => {
    assert.ok(!styleClassPatchSchema.safeParse({ name: 'Bad Name' }).success);
    assert.ok(!styleClassPatchSchema.safeParse({ variants: { 'desktop:bogus': { color: '#000' } } }).success);
  });
});
