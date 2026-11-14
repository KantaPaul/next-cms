import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { config, proxy } from './proxy';

describe('proxy dashboard locale rewrite', () => {
  it('rewrites /dashboard/es/pages to /dashboard/pages with x-cms-admin-locale', async () => {
    const req = new NextRequest('http://localhost:3001/dashboard/es/pages');
    const res = await proxy(req);
    assert.equal(res.headers.get('x-middleware-rewrite'), 'http://localhost:3001/dashboard/pages');
    assert.equal(res.headers.get('x-middleware-request-x-cms-admin-locale'), 'es');
  });

  it('does not rewrite /dashboard/api routes', async () => {
    const req = new NextRequest('http://localhost:3001/dashboard/api/health');
    const res = await proxy(req);
    assert.equal(res.headers.get('x-middleware-rewrite'), null);
    assert.equal(res.headers.get('x-middleware-request-x-cms-admin-locale'), null);
  });

  it('strips spoofed x-cms-admin-locale headers on unprefixed routes', async () => {
    const req = new NextRequest('http://localhost:3001/dashboard/pages', {
      headers: { 'x-cms-admin-locale': 'fr' },
    });
    const res = await proxy(req);
    assert.equal(res.headers.get('x-middleware-request-x-cms-admin-locale'), null);
  });
});

describe('proxy matcher', () => {
  // Next only runs the proxy for paths the matcher accepts; the tests above
  // call proxy() directly, so check the matcher itself too.
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it('runs the proxy on dashboard routes, with and without a locale', () => {
    for (const path of ['/dashboard', '/dashboard/pages', '/dashboard/es/pages', '/dashboard/ar/pages/create']) {
      assert.ok(matcher.test(path), path);
    }
  });

  it('still skips api, _next and static files', () => {
    for (const path of ['/api/forms/submit', '/_next/static/chunk.js', '/brand/logo.svg']) {
      assert.ok(!matcher.test(path), path);
    }
  });
});
