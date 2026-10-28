/**
 * Unit tests for site slug validation and helpers (R644/R645).
 * Pure functions - no database required.
 * Run with: npx tsx --test src/lib/utils/__tests__/site-slug.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateSiteSlug,
  RESERVED_SITE_SLUGS,
  slugifySiteName,
  resolveRoutingMode,
} from '../site-slug';

describe('validateSiteSlug', () => {
  it('accepts valid lowercase slugs', () => {
    assert.equal(validateSiteSlug('main').ok, true);
    assert.equal(validateSiteSlug('site-a').ok, true);
    assert.equal(validateSiteSlug('agency-2026').ok, true);
    assert.equal(validateSiteSlug('a1').ok, true);
  });

  it('rejects slugs shorter than 2 chars', () => {
    const result = validateSiteSlug('a');
    assert.equal(result.ok, false);
    assert.ok(/at least 2/.test((result as { error: string }).error));
  });

  it('rejects slugs longer than 40 chars', () => {
    const result = validateSiteSlug('a'.repeat(41));
    assert.equal(result.ok, false);
    assert.ok(/at most 40/.test((result as { error: string }).error));
  });

  it('rejects uppercase letters', () => {
    assert.equal(validateSiteSlug('Main').ok, false);
    assert.equal(validateSiteSlug('Site-A').ok, false);
  });

  it('rejects leading or trailing hyphens', () => {
    assert.equal(validateSiteSlug('-main').ok, false);
    assert.equal(validateSiteSlug('main-').ok, false);
  });

  it('rejects reserved routes', () => {
    for (const reserved of RESERVED_SITE_SLUGS) {
      const result = validateSiteSlug(reserved);
      assert.equal(result.ok, false, `${reserved} should be rejected`);
    }
    // Reserved routes that pass the format check get a dedicated error.
    for (const reserved of ['dashboard', 'api', 'login', 'blog', 'search', 'media']) {
      const result = validateSiteSlug(reserved);
      assert.equal(result.ok, false, `${reserved} should be reserved`);
      assert.ok(
        /reserved/.test((result as { error: string }).error),
        `${reserved} should name reserved`
      );
    }
  });

  it('rejects enabled locale codes', () => {
    const result = validateSiteSlug('en', { enabledLocaleCodes: ['en', 'es'] });
    assert.equal(result.ok, false);
    assert.ok(/locale/.test((result as { error: string }).error));
  });

  it('accepts a slug that matches a non-enabled locale code', () => {
    assert.equal(validateSiteSlug('pt', { enabledLocaleCodes: ['en', 'es'] }).ok, true);
  });
});

describe('slugifySiteName', () => {
  it('slugifies a site name', () => {
    assert.equal(slugifySiteName('Next CMS'), 'next-cms');
    assert.equal(slugifySiteName("Client's Site!"), 'client-s-site');
    assert.equal(slugifySiteName('   '), 'site');
    assert.equal(slugifySiteName('A'.repeat(50)), 'a'.repeat(40));
  });
});

describe('resolveRoutingMode', () => {
  it('an explicit mode wins over the env default', () => {
    assert.equal(resolveRoutingMode('path', 'production'), 'path');
    assert.equal(resolveRoutingMode('host', 'development'), 'host');
  });

  it('defaults to path in development', () => {
    assert.equal(resolveRoutingMode(undefined, 'development'), 'path');
  });

  it('defaults to host in production', () => {
    assert.equal(resolveRoutingMode(undefined, 'production'), 'host');
  });
});
