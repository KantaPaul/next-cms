import assert from 'node:assert';
import { describe, it } from 'node:test';
import { z } from 'zod';
import {
  allowedClasses,
  allowedClassList,
  dynamic,
  dynamicInner,
  isDynamicValue,
  responsive,
  responsiveInner,
  token,
  tokenKind,
  translatable,
  translatableInner,
  translatableValue,
} from '../schema-helpers';

describe('schema helpers (R778)', () => {
  it('responsive() validates a plain value or a per-device object', () => {
    const schema = responsive(z.number());
    assert.equal(schema.safeParse(4).success, true);
    assert.equal(schema.safeParse({ desktop: 4, mobile: 2 }).success, true);
    assert.equal(schema.safeParse({ desktop: 'nope' }).success, false);
  });

  it('responsiveInner exposes the wrapped schema, and only for responsive() schemas', () => {
    const inner = z.number();
    const schema = responsive(inner);
    assert.equal(responsiveInner(schema), inner);
    assert.equal(responsiveInner(z.string()), undefined);
  });

  it('token() validates a string and records its kind', () => {
    const schema = token('color');
    assert.equal(schema.safeParse('accent').success, true);
    assert.equal(schema.safeParse(1).success, false);
    assert.equal(tokenKind(schema), 'color');
    assert.equal(tokenKind(z.string()), undefined);
  });

  it('dynamic() validates a literal or a data binding', () => {
    const schema = dynamic(z.string());
    assert.equal(schema.safeParse('hello').success, true);
    assert.equal(
      schema.safeParse({ $dynamic: 'posts', path: 'title' }).success,
      true
    );
    assert.equal(schema.safeParse({ $dynamic: 1 }).success, false);
  });

  it('dynamicInner exposes the wrapped literal schema', () => {
    const inner = z.string();
    const schema = dynamic(inner);
    assert.equal(dynamicInner(schema), inner);
    assert.equal(dynamicInner(z.string()), undefined);
  });

  it('isDynamicValue recognizes a binding and rejects a literal', () => {
    assert.equal(isDynamicValue({ $dynamic: 'posts' }), true);
    assert.equal(isDynamicValue('posts'), false);
    assert.equal(isDynamicValue(undefined), false);
    assert.equal(isDynamicValue(null), false);
  });

  it('translatable() validates a plain value or a per-locale map', () => {
    const schema = translatable(z.string());
    assert.equal(schema.safeParse('Hello').success, true);
    assert.equal(
      schema.safeParse({ en: 'Hello', fr: 'Bonjour' }).success,
      true
    );
  });

  it('translatableInner exposes the wrapped schema', () => {
    const inner = z.string();
    const schema = translatable(inner);
    assert.equal(translatableInner(schema), inner);
    assert.equal(translatableInner(z.string()), undefined);
  });

  it('translatableValue falls back to the fallback locale, then returns a plain value as-is', () => {
    assert.equal(
      translatableValue({ en: 'Hello', fr: 'Bonjour' }, 'fr'),
      'Bonjour'
    );
    assert.equal(translatableValue({ en: 'Hello' }, 'fr'), 'Hello');
    assert.equal(translatableValue('Hi', 'fr'), 'Hi');
    assert.equal(translatableValue(undefined, 'fr'), undefined);
  });

  it('allowedClasses() only accepts classes from the allowlist', () => {
    const schema = allowedClasses(['sm', 'md', 'lg']);
    assert.equal(schema.safeParse(['sm', 'lg']).success, true);
    assert.equal(schema.safeParse(['xl']).success, false);
    assert.deepEqual(allowedClassList(schema), ['sm', 'md', 'lg']);
  });
});
