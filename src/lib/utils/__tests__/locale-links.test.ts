/**
 * localizeHref: internal links follow the page's locale when a translation exists.
 * Run with: npx tsx --test src/lib/utils/__tests__/locale-links.test.ts
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { localizeHref } from '../locale-links';

const map = new Map([
  ['/', '/es'],
  ['/about', '/es/acerca'],
  ['/blog/hello', '/es/blog/hola'],
]);

describe('localizeHref', () => {
  it('rewrites paths that have a translation', () => {
    assert.equal(localizeHref('/about', map), '/es/acerca');
    assert.equal(localizeHref('/about/', map), '/es/acerca');
    assert.equal(localizeHref('/', map), '/es');
    assert.equal(localizeHref('/blog/hello', map), '/es/blog/hola');
  });

  it('keeps query strings and hashes', () => {
    assert.equal(localizeHref('/about?x=1#team', map), '/es/acerca?x=1#team');
  });

  it('keeps a leading site slug', () => {
    assert.equal(localizeHref('/main/about', map, 'main'), '/main/es/acerca');
    assert.equal(localizeHref('/main', map, 'main'), '/main/es');
  });

  it('leaves links without a translation, external links and empty maps alone', () => {
    assert.equal(localizeHref('/pricing', map), '/pricing');
    assert.equal(localizeHref('https://example.com/about', map), 'https://example.com/about');
    assert.equal(localizeHref('//cdn.example.com/about', map), '//cdn.example.com/about');
    assert.equal(localizeHref('#about', map), '#about');
    assert.equal(localizeHref('/about', null), '/about');
    assert.equal(localizeHref('/about', new Map()), '/about');
  });
});
