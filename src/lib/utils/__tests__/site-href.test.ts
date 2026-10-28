/**
 * Unit tests for the siteHref URL helper (R655/R665).
 * Pure function - no database required.
 * Run with: npx tsx --test src/lib/utils/__tests__/site-href.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { siteHref } from '../site-href';

describe('siteHref', () => {
  it('leaves host-mode URLs unchanged (no siteSlug)', () => {
    assert.equal(siteHref('/about'), '/about');
    assert.equal(siteHref('/en/about'), '/en/about');
    assert.equal(siteHref('/'), '/');
  });

  it('prefixes internal URLs with the site slug', () => {
    assert.equal(siteHref('/about', 'main'), '/main/about');
    assert.equal(siteHref('/en/about', 'main'), '/main/en/about');
    assert.equal(siteHref('/', 'main'), '/main');
    assert.equal(siteHref('about', 'main'), '/main/about');
  });

  it('leaves absolute external URLs alone', () => {
    assert.equal(
      siteHref('https://example.com/about', 'main'),
      'https://example.com/about'
    );
    assert.equal(
      siteHref('http://example.com/page', 'main'),
      'http://example.com/page'
    );
  });

  it('leaves protocol-relative, mailto and tel links alone', () => {
    assert.equal(siteHref('//example.com/about', 'main'), '//example.com/about');
    assert.equal(siteHref('mailto:hello@example.com', 'main'), 'mailto:hello@example.com');
    assert.equal(siteHref('tel:+1234567890', 'main'), 'tel:+1234567890');
  });

  it('leaves hash-only links alone', () => {
    assert.equal(siteHref('#section', 'main'), '#section');
  });

  it('returns empty/undefined href unchanged', () => {
    assert.equal(siteHref('', 'main'), '');
    assert.equal(siteHref('#', 'main'), '#');
  });
});
