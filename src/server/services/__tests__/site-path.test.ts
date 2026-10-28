/**
 * Unit tests for path-mode site segment stripping and routing mode
 * (R652/R653/R665). Pure functions - no database required.
 * Run with: npx tsx --test src/server/services/__tests__/site-path.test.ts
 */
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import {
  routingMode,
  sitePathSegments,
} from '../../../lib/utils/site-slug';

const site = { slug: 'main' } as { slug: string | null };

describe('routingMode', () => {
  const orig = process.env.CMS_ROUTING_MODE;
  after(() => {
    process.env.CMS_ROUTING_MODE = orig;
  });

  it('honors CMS_ROUTING_MODE=path', () => {
    process.env.CMS_ROUTING_MODE = 'path';
    assert.equal(routingMode(), 'path');
  });
  it('honors CMS_ROUTING_MODE=host', () => {
    process.env.CMS_ROUTING_MODE = 'host';
    assert.equal(routingMode(), 'host');
  });
});

describe('sitePathSegments', () => {
  const orig = process.env.CMS_ROUTING_MODE;
  after(() => {
    process.env.CMS_ROUTING_MODE = orig;
  });

  it('strips the site segment in path mode', () => {
    process.env.CMS_ROUTING_MODE = 'path';
    assert.deepEqual(sitePathSegments('/main/en/about', site), ['en', 'about']);
    assert.deepEqual(sitePathSegments('/main', site), []);
    assert.deepEqual(sitePathSegments('/main/', site), []);
  });

  it('strips the site segment in both mode', () => {
    process.env.CMS_ROUTING_MODE = 'both';
    assert.deepEqual(sitePathSegments('/main/en/about', site), ['en', 'about']);
  });

  it('leaves segments unchanged in host mode', () => {
    process.env.CMS_ROUTING_MODE = 'host';
    assert.deepEqual(sitePathSegments('/main/en/about', site), [
      'main',
      'en',
      'about',
    ]);
  });

  it('does not strip when the first segment is not the site slug', () => {
    process.env.CMS_ROUTING_MODE = 'path';
    assert.deepEqual(sitePathSegments('/blog/foo', site), ['blog', 'foo']);
  });
});
